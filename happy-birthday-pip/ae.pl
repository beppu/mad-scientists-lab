#!/usr/bin/perl
use common::sense;
use AnyEvent;
use AnyEvent::Handle;
use Coro;
use Coro::AnyEvent;
use Config;

my $dev_input_event_file = shift || "/dev/input/event7";
my $cv = AnyEvent->condvar;
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
    $cv->send;
  },
  on_read  => sub {
    my ($hdl) = @_;
    my $rbuf  = $hdl->{rbuf};
    my $len   = length($rbuf);
    $hdl->unshift_read(chunk => $struct_size, sub {
      my ($hdl, $buffer) = @_;
      my ($sec, $usec, $type, $code, $value) =
        unpack('L!L!S!S!i!', $buffer);
      warn $len;  
      warn "sec:$sec, usec:$usec, type:$type, code:$code, value:$value";
    });
  }
);









$cv->recv;
