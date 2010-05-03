create table price (
  id integer primary key,
  symbol varchar(16),
  value float,
  day date
);

create index price_day on price (day);
