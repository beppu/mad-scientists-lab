use strict;
use warnings;
use DBI;

sub last_date {
  my ($dbh, $symbol) = @_;
  my ($last) = $dbh->selectall_arrayref("SELECT max(day) as day FROM price WHERE symbol = ?", { Slice => {} }, $symbol);
  $last->[0]{day};
}

1;
