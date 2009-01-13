package Chat;
use base 'Squatting';
use AnyEvent;
use Coro;
use Coro::AnyEvent;
use Coro::Signal;

sub service {
  my ($app, $c, @args) = @_;
  my $v = $c->v;
  $v->{listen} = 'null';
  $app->next::method($c, @args);
}

#_____________________________________________________________________________
package Chat::Controllers;
use strict;
use warnings;
use Squatting ':controllers';
use Squatting::H;
use JSON::XS;
use Coro;
use Time::HiRes 'time';
use Data::Dump 'pp';
use HTML::Entities;

#### data

# key   : channel name
# value : channel object
our %channels;

# generic channel object that you can clone
our $channel = Squatting::H->new({
  i        => 0,
  size     => 8,
  messages => [],
  signal   => Coro::Signal->new,

  write => sub {
    my ($self, @messages) = @_;
    my $i    = $self->{i};
    # warn $i;
    my $size = $self->{size};
    my $m    = $self->{messages};
    for (@messages) {
      $_->{time} = time;
      warn ">> " . $_->{time};
      $m->[$i++] = $_;
      $i = 0 if ($i >= $size);
    }
    # warn $i;
    $self->{i} = $i;
    $self->signal->broadcast;
    @messages;
  },

  read => sub {
    my ($self, $y) = @_;
    my $size = $self->{size};
    my $m    = $self->{messages};
    my $x;
    $y ||= 1;
    $y = $size if ($y > $size);
    my $i;
    $i = $self->{i} - 1;
    $i = ($size - 1) if ($i < 0);
    my @messages;
    for ($x = 0; $x < $y; $x++) {
      # warn $i;
      unshift @messages, $m->[$i];
      $i--;
      $i = ($size - 1) if ($i < 0);
    }
    @messages;
  },

  read_since => sub {
    my ($self, $last) = @_;
    grep { defined && ($_->{time} > $last) } $self->read($self->size);
  },
});

#### helpers

sub channels_from_input {
  my ($channels) = @_;
  my @ch;
  if ($channels) {
    if (ref($channels)) {
      @ch = @{ $channels };
    } else {
      @ch = $channels;
    }
  }
  @ch = keys our %channels unless @ch;
  @ch;
}

sub channel {
  my ($name) = @_;
  $channels{$name} ||= $channel->clone({ name => $name });
}


#### controllers

our @C = (

  C(
    Home => [ '/' ],
    get => sub {
      my ($self) = @_;
      my $v = $self->v;
      $v->{channels} = [ sort keys %channels ];
      $self->render('home');
    },
    post => sub {
      my ($self) = @_;
      my $input = $self->input;
      my $name = $input->{name};
      if ($name =~ /^(\w+)$/) {
        my $ch = channel($name);
        $self->redirect(R('Channel', $name));
      } else {
        $self->redirect(R('Home'));
      }
    },
  ),

  C(
    Channel => [ '/(\w+)' ],
    get => sub {
      my ($self, $name) = @_;
      my $v  = $self->v;
      my $ch = channel($name);
      $v->{my_name}  = $self->state->{name} || "anonymous";
      $v->{channel}  = $ch;
      $v->{listen}   = "[ '$name' ]";
      $v->{messages} = [ $v->{channel}->read($v->{channel}->size) ];
      my $last_ch = $self->state->{last_ch};
      if ($last_ch) {
        $last_ch->write({ type => 'leave' });
      }
      $ch->write({ type => 'enter' });
      $self->state->{last_ch} = $ch;
      $self->render('channel');
    },
    post => sub {
      my ($self, $name) = @_;
      my $v     = $self->v;
      my $input = $self->input;
      my $ch    = channel($name);
      my $handle  = encode_entities($input->{name});
      my $message = encode_entities($input->{message});
      $ch->write({ type => 'message', name => $handle, message => $message });
      if ($input->{name}) {
        $self->state->{name} = $input->{name};
      }
      if ($self->env->{'HTTP_X_REQUESTED_WITH'}) {
        # for ajax requests
        1;
      } else {
        # for people w/o javascript
        $self->redirect(R('Channel', $name));
      }
    }
  ),

  C(
    Event => [ '/@event' ],
    get => sub {
      warn "coro [$Coro::current]";
      my ($self) = shift;
      my $input  = $self->input;
      my $cr     = $self->cr;
      my @ch     = channels_from_input($input->{channels});
      my $last   = 0;
      while (1) {
        # Output
        warn "top of loop";
        my @events = 
          grep { defined } 
          map  { my $ch = $channels{$_}; $ch->read_since($last) } @ch;
        my $x = async {
          warn "printing...".encode_json(\@events);
          $cr->print(encode_json(\@events));
        };
        $x->join;
        $last = time;

        # Hold for a brief moment until the next long poll request comes in.
        warn "waiting for next request";
        $cr->next;
        my $channels = [ $cr->param('channels') ];
        @ch = channels_from_input($channels);

        # Start 1 coro for each channel we're listening to.
        # Each coro will have the same Coro::Signal object, $activity.
        my $activity = Coro::Signal->new;
        my @coros = map {
          my $ch = $channels{$_};
          async { $ch->signal->wait; $activity->broadcast };
        } @ch;

        # The first coro that runs $activity->broadcast wins.
        warn "waiting for activity on any of (@ch); last is $last";
        $activity->wait;

        # Cancel the remaining coros.
        for (@coros) { $_->cancel }
      }
    },
    queue => { get => 'event' },
  ),
);



#_____________________________________________________________________________
package Chat::Views;
use strict;
use warnings;
use Squatting ':views';
use HTML::AsSubs;
use Data::Dump 'pp';

sub span  { HTML::AsSubs::_elem('span', @_) }
sub thead { HTML::AsSubs::_elem('thead', @_) }
sub tbody { HTML::AsSubs::_elem('tbody', @_) }
sub x     { map { HTML::Element->new('~literal', text => $_) } @_ }

our @V = (

  V(
    'default',
    layout => sub {
      my ($self, $v, $content) = @_;
      html(
        head(
          title( $v->{title} ),
          style(x( $self->_css )),
          script({ src => 'jquery.js' }),
          script({ src => 'jquery.ev.js' }),
          script({ src => 'chat.js' }),
          script(x(qq|
            \$chat = {
              listen: $v->{listen}
            };
          |)),
        ),
        body(

          div({ id => 'factory', style => 'display: none' },
            table(
              tbody(
                &tr({ class => 'message' }, td({ class => 'name' }), td()),
              ),
            ),
          ),

          do {
            if ($v->{channel}) {
              my $ch = $v->{channel};
              h1({ id => 'title' }, a({ href => R('Home') }, "Chat"), span(' : '), span('#'.$ch->name));
            } else {
              h1({ id => 'title' }, a({ href => R('Home') }, "Chat"));
            }
          },

          x( $content )
        )
      )->as_HTML;
    },

    _css => sub {qq|

      body {
        background: #112;
        color: #eee;
        font-family: "Trebuchet MS", Verdana, sans-serif;
      }

      #messages {
        font-size: 9pt;
      }

      #title {
        font-size: 36pt;
        border-bottom: 2px solid #223;
      }

      #title a {
        color: #ccf;
        text-decoration: none;
      }

      #title a:hover {
        color: #fff;
      }

      tr.message td.name {
        width: 100px;
        color: #fe4;
        text-align: right;
      }

      input.name {
        width: 100px;
        text-align: right;
      }

      input.name,
      input.message {
        background: #dde;
        color: #112;
        border: 1px solid #223;
      }

    |},

    home => sub {
      my ($self, $v) = @_;
      div({id => 'main'},
        h1("Channels"),
        form({ method => 'POST' },
          ul(
            (map { li(a({href=>R('Channel', $_)}, $_)) } @{$v->{channels}}),
            li(input({ type => 'text', name => 'name', value => 'channel' }), input({ type => 'submit', value => 'Create Channel' })),
          ),
        ),
        h1("For Hackers"),
        h2('starting the event loop from javascript'),
        pre(
          '$.ev.loop("/@event", [ 2, 4 ])'."\n",
        ),
        h2('stopping the event loop from javascript'),
        pre(
          '$.ev.stop()'."\n",
        ),
        #h2('for testing purposes, you can post a dummy event like this.'),
        #pre(
        #  "curl http://localhost:4234/\@event --data-ascii channels=2\n",
        #)
      )->as_HTML;
    },

    channel => sub {
      my ($self, $v) = @_;
      my $ch = $v->{channel};
      div(
        form({ id => 'chat', name => 'chat', method => 'post' },
          table(
            tbody({ id => 'messages' },
              map { 
                if (defined $_ && $_->{type} eq 'message') {
                  &tr({ class => 'message' }, td({ class => 'name' }, x($_->{name})), td(x($_->{message}))) 
                } else {
                  &tr({ class => 'message' }, td({ class => 'name' }, ""), td("")) 
                }
              } @{ $v->{messages} }
            ),
          ),
          div(
            input({ class => 'name',    type => 'text', size => '10', name => 'name', value => $v->{my_name} }),
            input({ class => 'message', type => 'text', size => '40', name => 'message' }),
            input({ type => 'submit', value => 'Say' }),
          ),
        )
      )->as_HTML;
    },

  )

);

1;
