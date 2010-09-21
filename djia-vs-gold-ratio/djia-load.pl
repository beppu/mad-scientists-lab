#!/usr/bin/perl
use strict;
use warnings;

use Text::CSV_XS;
use DBI;

require 'utils.pl';

my $dbh = DBI->connect("dbi:SQLite:dbname=prices.db", "", "") or die DBI->errstr;
my $last_date = last_date($dbh, 'DJIA');

for my $file (@ARGV) {
  my $csv = Text::CSV_XS->new({ binary => 1 })
    or die "Cannot use CSV: " . Text::CSV->error_diag();
  open my $fh, "<:encoding(utf8)", $file  or die "$file: $!";
  $csv->getline($fh); # throw away first line
  while (my $row = $csv->getline($fh)) {
    my ($date, $open, $high, $low, $close) = @$row;
    next unless $date gt $last_date;
    $dbh->do(
      "INSERT INTO price (symbol, value, day) VALUES ('DJIA', ?, ?)", {},
      $close, $date
    );
  }
  $csv->eof or $csv->error_diag ();
  close $fh;
}
