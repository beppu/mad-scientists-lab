#!/usr/bin/perl
use strict;
use warnings;

use AnyEvent;
use aliased 'Squatting::H';

my $every_frame = AnyEvent->timer(
);
my $joystick = AnyEvent->io();

my $scene = H->new(
  {
    handler => sub { },
    start   => sub { },
  }
);




AE::cv->recv;


__END__

=head1 NAME

cxid -- CompleX Input Detection

=head1 SYNOPSIS

The Game API I Would Like

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
    Holy ShitBallz

