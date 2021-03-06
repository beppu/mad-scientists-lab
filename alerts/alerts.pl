#!/usr/bin/env perl

use strict;
use warnings;

my @timeframes = qw(1m 3m 5m 15m 30m 1h 2h 4h 6h 8h 12h 1d 3d 1w 1M);

sub cross_sh {
  my ($tf, $ma, $period1, $period2) = @_;
  my $MA = uc $ma;
  if ($period1 < $period2) {
    # bullish
    my $type = ($period1 == 50 && $period2 == 200) ? "golden" : "bullish";
    qq|aligned --timeframe $tf $ma $period1 $period2 && alert --timeframe $tf "$period1/$period2 $MA $type cross" --webhook "$ENV{ALERT_BULLISH_CROSS}"|;
  } else {
    # bearish
    my $type = ($period1 == 200 && $period2 == 50) ? "death" : "bearish";
    qq|aligned --timeframe $tf $ma $period1 $period2 && alert --timeframe $tf "$period2/$period1 $MA $type cross" --webhook "$ENV{ALERT_BEARISH_CROSS}"|;
  }
}

sub aligned_sh {
  my ($tf, $ma, @periods) = @_;
  my $MA = uc $ma;
  if ($periods[0] < $periods[$#periods]) {
    # bullish
    my $ps = join('/', @periods);
    qq|aligned --timeframe $tf $ma @periods && alert --timeframe $tf "$tf $ps $MA in bullish alignment" --webhook "$ENV{ALERT_BULLISH_ALIGNED}"|
  }
  else {
    # bearish
    my $ps = join('/', reverse @periods);
    qq|aligned --timeframe $tf $ma @periods && alert --timeframe $tf "$tf $ps $MA in bearish alignment" --webhook "$ENV{ALERT_BULLISH_ALIGNED}"|
  }
}

sub price_above_sh {
  my ($tf, $ma, $period) = @_;
  my $MA = uc $ma;
  qq|price --timeframe $tf --gt $ma $period && alert --timeframe $tf "Price is above the $tf $period $MA" --webhook "$ENV{ALERT_BULLISH_PRICE}"|;
}

sub price_below_sh {
  my ($tf, $ma, $period) = @_;
  my $MA = uc $ma;
  qq|price --timeframe $tf --lt $ma $period && alert --timeframe $tf "Price is below the $tf $period $MA" --webhook "$ENV{ALERT_BEARISH_PRICE}"|;
}

sub bullish_divergence_sh {
  my ($tf) = @_;
  qq|divergence --timeframe $tf && alert --timeframe $tf "$tf Bullish divergence" --webhook "$ENV{ALERT_BULLISH_DIVERGENCE}"|;
}

sub bearish_divergence_sh {
  my ($tf) = @_;
  qq|divergence --timeframe $tf --bearish && alert --timeframe $tf "$tf Bearish divergence" --webhook "$ENV{ALERT_BEARISH_DIVERGENCE}"|;
}

sub guppy_green_sh {
  my ($tf) = @_;
  qq|guppy --timeframe $tf --green && alert --timeframe $tf "Guppy EMAs have turned green" --webhook "$ENV{ALERT_BULLISH_DIVERGENCE}"|;
}

sub guppy_gray_sh {
  my ($tf) = @_;
  qq|guppy --timeframe $tf --gray && alert --timeframe $tf "Guppy EMAs have turned gray" --webhook "$ENV{ALERT_SMALL}"|;
}

sub guppy_red_sh {
  my ($tf) = @_;
  qq|guppy --timeframe $tf --red && alert --timeframe $tf "Guppy EMAs have turned red" --webhook "$ENV{ALERT_BEARISH_DIVERGENCE}"|;
}

# casual interest
my %casual_alerts = (
  '1m'  => [],
  '3m'  => [],
  '5m'  => [],
  '15m' => [],
  '30m' => [],
  '1h'  => [],
  '2h'  => [],
  '4h'  => [
    cross_sh('4h', 'sma', 50, 200),
    cross_sh('4h', 'sma', 200, 50),
    cross_sh('4h', 'ema', 50, 200),
    cross_sh('4h', 'ema', 200, 50),
  ],
  '6h'  => [],
  '8h'  => [],
  '12h' => [
    bullish_divergence_sh('12h'),
    bearish_divergence_sh('12h'),
    price_above_sh('12h', 'sma', 200),
    price_below_sh('12h', 'sma', 200),
    guppy_green_sh('12h'),
    guppy_red_sh('12h'),
  ],
  '1d'  => [
    bullish_divergence_sh('1d'),
    bearish_divergence_sh('1d'),
    price_above_sh('1d', 'sma', 200),
    price_below_sh('1d', 'sma', 200),
    guppy_green_sh('1d'),
    guppy_gray_sh('1d'),
    guppy_red_sh('1d'),
  ],
  '3d'  => [],
  '1w'  => [],
  '1M'  => [],
);

# actively traded
my %active_alerts = (
  '1m'  => [],
  '3m'  => [
    price_above_sh('3m', 'sma', 960),
    price_below_sh('3m', 'sma', 960),
  ],
  '5m'  => [
    price_above_sh('5m', 'sma', 960),
    price_below_sh('5m', 'sma', 960),
  ],
  '15m' => [
    price_above_sh('15m', 'sma', 960),
    price_below_sh('15m', 'sma', 960),
    price_above_sh('15m', 'sma', 200),
    price_below_sh('15m', 'sma', 200),
  ],
  '30m' => [
    price_above_sh('30m', 'sma', 960),
    price_below_sh('30m', 'sma', 960),
  ],
  '1h'  => [
    price_above_sh('1h', 'sma', 960),
    price_below_sh('1h', 'sma', 960),
    price_above_sh('1h', 'sma', 200),
    price_below_sh('1h', 'sma', 200),
    bullish_divergence_sh('1h'),
    bearish_divergence_sh('1h'),
    aligned_sh('1h', 'sma', 50, 100, 200),
    aligned_sh('1h', 'sma', 200, 100, 50),
    guppy_green_sh('1h'),
    guppy_gray_sh('1h'),
    guppy_red_sh('1h'),
  ],
  '2h'  => [
    price_above_sh('2h', 'sma', 960),
    price_below_sh('2h', 'sma', 960),
    bullish_divergence_sh('2h'),
    bearish_divergence_sh('2h'),
  ],
  '4h'  => [
    price_above_sh('4h', 'sma', 960),
    price_below_sh('4h', 'sma', 960),
    price_above_sh('4h', 'sma', 200),
    price_below_sh('4h', 'sma', 200),
    price_above_sh('4h', 'sma', 50),
    price_below_sh('4h', 'sma', 50),
    price_above_sh('4h', 'sma', 20),
    price_below_sh('4h', 'sma', 20),
    bullish_divergence_sh('4h'),
    bearish_divergence_sh('4h'),
    cross_sh('4h', 'sma', 50, 200),
    cross_sh('4h', 'sma', 200, 50),
    cross_sh('4h', 'ema', 50, 200),
    cross_sh('4h', 'ema', 200, 50),
    aligned_sh('4h', 'sma', 50, 100, 200),
    aligned_sh('4h', 'sma', 200, 100, 50),
    guppy_green_sh('4h'),
    guppy_gray_sh('4h'),
    guppy_red_sh('4h'),
  ],
  '6h'  => [
    price_above_sh('6h', 'sma', 960),
    price_below_sh('6h', 'sma', 960),
    bullish_divergence_sh('6h'),
    bearish_divergence_sh('6h'),
  ],
  '8h'  => [
    price_above_sh('8h', 'sma', 960),
    price_below_sh('8h', 'sma', 960),
    bullish_divergence_sh('8h'),
    bearish_divergence_sh('8h'),
  ],
  '12h' => [
    price_above_sh('12h', 'sma', 960),
    price_below_sh('12h', 'sma', 960),
    price_above_sh('12h', 'sma', 200),
    price_below_sh('12h', 'sma', 200),
    price_above_sh('12h', 'sma', 20),
    price_below_sh('12h', 'sma', 20),
    bullish_divergence_sh('12h'),
    bearish_divergence_sh('12h'),
    cross_sh('12h', 'sma', 50, 200),
    cross_sh('12h', 'sma', 200, 50),
    cross_sh('12h', 'ema', 50, 200),
    cross_sh('12h', 'ema', 200, 50),
    aligned_sh('12h', 'sma', 50, 100, 200),
    aligned_sh('12h', 'sma', 200, 100, 50),
    guppy_green_sh('12h'),
    guppy_gray_sh('12h'),
    guppy_red_sh('12h'),
  ],
  '1d'  => [
    price_above_sh('1d', 'sma', 960),
    price_below_sh('1d', 'sma', 960),
    price_above_sh('1d', 'sma', 200),
    price_below_sh('1d', 'sma', 200),
    price_above_sh('1d', 'sma', 50),
    price_below_sh('1d', 'sma', 50),
    price_above_sh('1d', 'sma', 20),
    price_below_sh('1d', 'sma', 20),
    price_above_sh('1d', 'ema', 13),
    price_below_sh('1d', 'ema', 13),
    price_above_sh('1d', 'ema', 9),
    price_below_sh('1d', 'ema', 9),
    bullish_divergence_sh('1d'),
    bearish_divergence_sh('1d'),
    cross_sh('1d', 'sma', 50, 200),
    cross_sh('1d', 'sma', 200, 50),
    cross_sh('1d', 'ema', 50, 200),
    cross_sh('1d', 'ema', 200, 50),
    aligned_sh('1d', 'sma', 50, 100, 200),
    aligned_sh('1d', 'sma', 200, 100, 50),
    guppy_green_sh('1d'),
    guppy_gray_sh('1d'),
    guppy_red_sh('1d'),
  ],
  '3d'  => [
    price_above_sh('3d', 'sma', 50),
    price_below_sh('3d', 'sma', 50),
    price_above_sh('3d', 'sma', 100),
    price_below_sh('3d', 'sma', 100),
    price_above_sh('3d', 'sma', 200),
    price_below_sh('3d', 'sma', 200),
  ],
  '1w'  => [
    price_above_sh('1w', 'sma', 50),
    price_below_sh('1w', 'sma', 50),
    price_above_sh('1w', 'sma', 100),
    price_below_sh('1w', 'sma', 100),
    price_above_sh('1w', 'ema', 50),
    price_below_sh('1w', 'ema', 50),
    price_above_sh('1w', 'ema', 100),
    price_below_sh('1w', 'ema', 100),
  ],
  '1M'  => [],
);

my %debug = (
  '15m' => [
    price_above_sh('15m', 'sma', 68),
    price_below_sh('15m', 'sma', 68),
  ]
);

sub run_alerts {
  my $alerts = shift;
  for my $tf (@timeframes) {
    my $alerts = $alerts->{$tf};
    for my $al (@$alerts) {
      print "$al\n";
      system($al)
    }
  }
}

my %profiles = (
  casual => \%casual_alerts,
  active => \%active_alerts,
  debug  => \%debug,
);
my $p = shift || 'casual';

run_alerts($profiles{$p})
