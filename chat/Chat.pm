package Chat;
use base 'Squatting';
use AnyEvent;
use Coro;
use Coro::AnyEvent;
use Coro::Signal;



# a slot-based object WITHOUT prototype-based inheritance
#_____________________________________________________________________________
package Object;
use strict;
no  warnings 'once';
use JSON::XS;
use Clone;

# $json
our $json = JSON::XS->new;
$json->utf8(1);
$json->allow_blessed(1);
$json->convert_blessed(1);

our $AUTOLOAD;

# Object->new(\%merge) -- constructor
sub new {
  my ($class, $opts) = @_;
  $opts ||= {};
  bless { %$opts } => $class;
}

# $object->merge(\%merge) -- merge keys and values of another hashref into $self
sub merge {
  my ($self, $merge) = @_;
  for (keys %$merge) {
    $self->{$_} = $merge->{$_};
  }
  $self;
}
                  
# $object->clone(\%merge) -- copy constructor
sub clone {
  my ($self, $merge) = @_;
  my $clone = Clone::clone($self);
  $clone->merge($merge) if ($merge);
  $clone;
}

# $object->keys -- keys of underlying hashref of $object
sub keys {
  CORE::keys(%{$_[0]})
}

# $object->as_hash -- unbless
sub as_hash {
  +{ %{$_[0]} };
}
*to_hash = \&as_hash;

# $object->as_json -- serialize $object as json
sub as_json {
  my ($self) = @_;
  if ($self->{to_json}) {
    $self->{to_json}->($self);
  } else {
    $json->encode($self->to_hash);
  }
}
*to_json = \&as_json;
*TO_JSON = \&as_json;

# $self->$method -- treat key values as methods
sub AUTOLOAD {
  my ($self, @args) = @_;
  my $attr = $AUTOLOAD;
  $attr =~ s/.*://;
  if (ref($self->{$attr}) eq 'CODE') {
    $self->{$attr}->($self, @args)
  } else {
    if (@args) {
      $self->{$attr} = $args[0];
    } else {
      $self->{$attr};
    }
  }
}

sub DESTROY { }



#_____________________________________________________________________________
package Chat::Controllers;
use strict;
use warnings;
use Squatting ':controllers';
use JSON::XS;
use Coro;
use Time::HiRes 'time';

# key   : channel name
# value : channel object
our %channels;

# generic channel object that you can clone
our $channel = Object->new({
  i        => 0,
  size     => 4,
  messages => [],
  signal   => Coro::Signal->new,

  write => sub {
    my ($self, @messages) = @_;
    my $i    = $self->{i};
    # warn $i;
    my $size = $self->{size};
    my $m    = $self->{messages};
    for (@messages) {
      $m->[$i++] = [time, $_];
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
});


# helper
sub channels {
  my ($channels) = @_;
  my @ch;
  if ($channels) {
    if (ref($channels)) {
      @ch = @{ $channels };
    } else {
      @ch = $channels;
    }
  }
  @ch = keys %channels unless @ch;
  @ch;
}

## channel setup
for (qw(2 4 6 8 foo bar baz lobby)) {
  $channels{$_} = $channel->clone({ name => $_ });
}

our @C = (

  C(
    Home => [ '/' ],
    get => sub {
      my ($self) = @_;
      $self->render('home');
    }
  ),

  C(
    Channel => [ '/(\w+)' ],
    get => sub {
      my ($self, $channel_name) = @_;
      my $v = $self->v;
      $v->{channel} = $channels{$channel_name};
      $v->{channel_name} = $channel_name;
      $self->render('channel');
    }
  ),

  C(
    Event => [ '/@event' ],
    get => sub {
      warn "coro [$Coro::current]";
      my ($self) = shift;
      my $input  = $self->input;
      my $cr     = $self->cr;
      my @ch     = channels($input->{channels});
      my $last   = time;
      while (1) {
        # Output
        warn "top of loop";
        my @events = 
          grep { defined } 
          map  { my $ch = $channels{$_}; $ch->read(4) } @ch;
        my $x = async {
          warn "printing...".encode_json(\@events);
          $cr->print(encode_json(\@events));
        };
        $x->join;

        # Hold for a brief moment until the next long poll request comes in.
        warn "waiting for next request";
        $cr->next;
        $last = time;
        my $channels = [ $cr->param('channels') ];
        @ch = channels($channels);

        # Try starting up 1 coroutine per channel.
        # Each coroutine will have the same Coro::Signal object, $activity.
        my $activity = Coro::Signal->new;
        my @coros = map {
          my $ch = $channels{$_};
          async { $ch->signal->wait; $activity->broadcast };
        } @ch;

        # The first one who sends a signal to $activity wins.
        warn "waiting for activity on any of (@ch)";
        $activity->timed_wait(20);

        # Cancel the remaining coros.
        for (@coros) { $_->cancel }
      }
    },

    # The current POST action exists for debugging purposes, only.
    # In practice, channel updates will happen ambiently 
    # when model data changes.
    # Hooks will be in place to facilitate this.
    # 
    # In the future, the POST action may be used as a notification
    # to the server side that $.ev.stop() happened
    # on the client side.
    post => sub {
      my ($self) = shift;
      my $input  = $self->input;
      my $ch = $channels{ $input->{channels} };
      if ($ch) {
        $ch->write({ type => 'time', value => scalar(localtime) });
      }
      1;
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
        ),
        body(
          x( $content )
        )
      )->as_HTML;
    },

    _css => sub {qq|
    |},

    home => sub {
      my ($self, $v) = @_;
      div({id => 'main'},
        a({ href => R('Channel', 'lobby') }, 'lobby' ),
        h2('starting the event loop from javascript'),
        pre(
          '$.ev.loop("/@event", [ 2, 4 ])'."\n",
        ),
        h2('stopping the event loop from javascript'),
        pre(
          '$.ev.stop()'."\n",
        ),
        h2('for testing purposes, you can post a dummy event like this.'),
        pre(
          "curl http://localhost:4234/\@event --data-ascii channels=2\n",
        )
      )->as_HTML;
    },

    channel => sub {
      my ($self, $v) = @_;
      div(
        h1("channel:  " . $v->{channel_name})
      )->as_HTML;
    },

  )

);

1;
