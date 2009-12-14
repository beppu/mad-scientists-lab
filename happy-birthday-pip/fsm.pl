package FSM;

use common::sense;
use aliased 'Squatting::H';
use Try::Tiny;
use base 'Exporter';
our @EXPORT = qw($recorder $fsm $table_builder);

my $recorder = H->new({
  recorder_data => {},
  record => sub {
    my ($self, $method) = @_;
    my $original_method = $self->{$method};
    die unless defined($original_method);
    $self->{$method} = sub {
      my ($self, @args) = @_;
      push @{$self->{recorder_data}{$method}}, [ @args ];
      $original_method->($self, @args);
    }
  },
  play_back => sub {
    my ($self, $method) = @_;
    @{ $self->recorder_data->{$method} };
  },
});

my $fsm = H->new({
  %$recorder,
  state => 'initial',
  table => {
    initial => {
      a => 'punch',
      b => 'kick',
      t => 'initial',
    },
    punch => {
      a => 'punch',
      b => 'kick',
      t => 'initial',
    },
    kick => {
      a => 'punch',
      b => 'kick',
      t => 'initial',
    },
  },
  input => sub {
    my ($self, $input) = @_;
    my $new_state = $self->{table}{$self->{state}}{$input};
    $self->state($new_state);
  },
  if => sub {
    my ($self, $input) = @_;
    $self->{table}{$self->{state}}{$input};
  },
  add => sub {
    my ($self, $name, @inputs) = @_;
    $self->state('initial');
    for (@inputs) {
      if (defined $self->next_state($_)) {
      }
    }
  }
});

$fsm->record('input');

$fsm;
