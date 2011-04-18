#!/usr/bin/perl

use common::sense;
use aliased 'Squatting::H';

use AnyEvent;
use AnyEvent::Handle;
use Coro;
use Coro::AnyEvent;
use Config;

$| = 1;

my $fsm = do 'fsm.pl';

my $raw_event_fsm   = $fsm->clone;
my $joy_event_fsm   = $fsm->clone;
my $complex_joy_fsm = $fsm->clone;

# timer event generator that feeds into the $raw_event_fsm
my $f = 0;
my $frames_per_second = 60;
my $frame_events = AnyEvent->timer(
  after    => 0,
  interval => 1.0 / $frames_per_second,
  cb       => sub {
    $raw_event_fsm->input('t');
  }
);

# joystick event reader that feeds into $raw_event_fsm 
my $dev_input_event_file = shift || "/dev/input/event4";
warn $dev_input_event_file;
open(my $js1_fh, $dev_input_event_file) or die $!;
my $struct_size = (
  ($Config{longsize} * 2) +   # input_event.time (struct timeval)
  ($Config{ i16size} * 2) +   # input_event.type, input_event.code
  ($Config{ i32size}    )     # input_event.value
);
warn $struct_size;
my $js1; $js1 = AnyEvent::Handle->new(
  fh       => $js1_fh,
  on_error => sub {
    my ($hdl, $fatal, $msg) = @_;
    warn "got error $msg\n";
    $hdl->destroy;
  },
  on_read  => sub {
    my ($hdl) = @_;
    my $rbuf  = $hdl->{rbuf};
    my $len   = length($rbuf);
    $hdl->unshift_read(chunk => $struct_size, sub {
      my ($hdl, $buffer) = @_;
      my ($sec, $usec, $type, $code, $value) =
        unpack('L!L!S!S!i!', $buffer);
      warn "sec:$sec, usec:$usec, type:$type, code:$code, value:$value";
    });
  }
);

# scene object prototype
#   A scene is a way to modularize the various user interfaces a game has.
my $scene = H->new({
  handler => sub { },
  start   => sub { },
});


# game object prototype
#   A game is essentially a collection of scenes that you can switch between.
my $game = H->new({

  # start the event loop
  start => sub {
    warn "starting game";
    AE::cv->recv;
  }
});

my $asciicker = $game->clone;

$asciicker->start;

__END__

=head1 NAME

cxid -- CompleX Input Detection

=head1 SYNOPSIS

This is an exploratory programming exercise where I try
to figure out how I would structure the objects that
compose a game.

=head1 MEDITATION

WTF does a game do?

  - Constantly look for input

  - Draw an intro screen
    onUp: menu_cursor_up
    onDown: menu_cursor_down
    onButton1: select, transition_to(menu_entry)

  - Character Select
    onUp:
    onDown;
    onLeft;
    onRight;
    onButton1;
    onButton2;

  - Fight
    rectangles vs rectangles.

=cut
