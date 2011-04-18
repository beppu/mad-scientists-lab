#!/usr/bin/perl
use strict;
use warnings;

use Spreadsheet::ParseExcel;
use DBI;
use Data::Dump 'pp';

require 'utils.pl';

my %month_number = (
  Jan => '01',
  Feb => '02',
  Mar => '03',
  Apr => '04',
  May => '05',
  Jun => '06',
  Jul => '07',
  Aug => '08',
  Sep => '09',
  Oct => '10',
  Nov => '11',
  Dec => '12',
);

sub date {
  my @part = split('-', $_[0]);
  sprintf(
    '%d-%s-%02d',
    2000 + $part[2],
    $month_number{$part[1]},
    $part[0]
  );
}

my $dbh = DBI->connect("dbi:SQLite:dbname=prices.db", "", "") or die DBI->errstr;
my $last_date = last_date($dbh, 'XAU');

for (@ARGV) {
  my $parser = Spreadsheet::ParseExcel->new();
  my $workbook = $parser->parse($_) or die $parser->error;

  my $daily_gold = $workbook->worksheet('data');
  my ($min, $max) = $daily_gold->row_range;
  for my $row ($min .. $max) {
    my $date_cell = $daily_gold->get_cell($row, 0);
    my $usd_cell  = $daily_gold->get_cell($row, 1);
    my $date      = date($date_cell->value);
    next unless $date gt $last_date;
    #print date($date_cell->value), " -- ", $usd_cell->value, "\n";
    $dbh->do(
      "INSERT INTO price (symbol, value, day) VALUES ('XAU', ?, ?)", {},
      $usd_cell->value,
      $date
    );
  }
}
