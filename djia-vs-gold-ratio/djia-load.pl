#!/usr/bin/perl
use strict;
use warnings;

use Text::CSV_XS;
use DBI;

my $dbh = DBI->connect("dbi:SQLite:dbname=prices.db", "", "") or die DBI->errstr;

for my $file (@ARGV) {
  my $csv = Text::CSV_XS->new({ binary => 1 })
    or die "Cannot use CSV: " . Text::CSV->error_diag();
  open my $fh, "<:encoding(utf8)", $file  or die "$file: $!";
  while (my $row = $csv->getline($fh)) {
    my ($date, $open, $high, $low, $close) = @$row;
    $dbh->do(
      "INSERT INTO price (symbol, value, day) VALUES ('DJIA', ?, ?)", {},
      $close, $date
    );
  }
  $csv->eof or $csv->error_diag ();
  close $fh;
}
