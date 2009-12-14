#!/usr/bin/perl
use strict;
use warnings;

use AnyEvent;
use Coro;

$| = 1;
# print "enter your name> ";
# 
# my $name;
# 
# my $wait_for_input = AnyEvent->io(
#   fh   => \*STDIN,    # which file handle to check
#   poll => 'r',        # which event to wait for ("r"ead data)
#   cb   => sub {       # what callback to execute
#     $name = <STDIN>;    # read it
#     exit unless defined $name;
#     chomp $name;
#     print "Your name is $name.\n";
#     print "enter your name> ";
#   }
# );
my $frames = shift || 60;

# 60 frames per second
my $f = 0;
my $frame_events = AnyEvent->timer(
  after    => 0,
  interval => 1.0 / $frames,
  cb       => sub {
    print ".";
    $f++;
    if ($f % $frames == 0) {
      print "\n";
    }
  }
);

# # read joystick data
# my $js1_events = AnyEvent->io(
#   fh   => undef,
#   poll => 'r',
#   cb   => sub {
#     my ($fh) = @_;
#     my ($sec, $usec, $type, $code, $value) =
#       unpack('L!L!S!S!i!', $buffer);
#   }
# );

# do something else here
AE::cv->recv;
