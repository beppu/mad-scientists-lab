# For use in || chains,
# if the exit code is -1 to -128 (aka 255 to 128), stop the || chain .
skip_errors() {
  # process.exit(n) where n is -1 to -128 should be ignored.
  # n ==   -1 => $? == 255
  # n == -128 => $? == 128
  # where n is an 8-bit signed integer
  ec=$?
  if [ "$ec" -gt 127 ] ; then
    return 0
  else
    return 1
  fi
}

# Check if a price has gone above a horizontal level.
horizontal_gt() {
  tf=$1
  price=$2
  horizontal --timeframe $tf --gt $price \
    && alert --timeframe $tf --webhook $ALERT_BULLISH_PRICE "Price above $price"
}

# Check if a price has gone below a horizontal level.
horizontal_lt() {
  tf=$1
  price=$2
  horizontal --timeframe $tf --lt $price \
    && alert --timeframe $tf --webhook $ALERT_BEARISH_PRICE "Price below $price"
}

# Check if Guppy EMAs have turned green
guppy_green() {
  tf=$1
  guppy --timeframe $tf --green \
    && alert --timeframe $tf --webhook $ALERT_BEARISH_ALIGNED "Guppy EMAs have turned green"
}

# Check if Guppy EMAs have turned gray
guppy_gray() {
  tf=$1
  guppy --timeframe $tf --gray \
    && alert --timeframe $tf --webhook $ALERT_SMALL "Guppy EMAs have turned gray"
}

# Check if Guppy EMAs have turned red
guppy_red() {
  tf=$1
  guppy --timeframe $tf --red \
    && alert --timeframe $tf --webhook $ALERT_BEARISH_ALIGNED "Guppy EMAs have turned red"
}

# Check if price has crossed above an MA
price_gt() {
  tf=$1
  ma=$2
  big_ma=`echo $ma | tr a-z A-Z`
  period=$3
  price --timeframe $tf --gt $ma $period \
    && alert --timeframe $tf --webhook $ALERT_BULLISH_PRICE "Price is above the $period $big_ma"
}

# Check if price has crossed below an MA
price_lt() {
  tf=$1
  ma=$2
  big_ma=`echo $ma | tr a-z A-Z`
  period=$3
  price --timeframe $tf --gt $ma $period \
    && alert --timeframe $tf --webhook $ALERT_BULLISH_PRICE "Price is below the $period $big_ma"
}

# Check for bullish MA alignment
aligned_bullish() {
  tf=$1
  ma=$2
  shift; shift
  big_ma=`echo $ma | tr a-z A-Z`
  ps=`echo $@ | sed 's, ,/,g'`
  aligned --timeframe $tf $ma $@ \
    && alert --timeframe $tf --webhook $ALERT_BULLISH_ALIGNED "$tf $ps $big_ma in bullish alignment"
}

# Check for bearish MA alignment
aligned_bearish() {
  tf=$1
  ma=$2
  shift; shift
  big_ma=`echo $ma | tr a-z A-Z`
  # https://stackoverflow.com/a/8522933
  ps=`printf '%s\n' "$@" | tac | paste -s -d '/' -`
  aligned --timeframe $tf $ma $@ \
    && alert --timeframe $tf --webhook $ALERT_BULLISH_ALIGNED "$tf $ps $big_ma in bearish alignment"
}

# Check for bullish divergence
divergence_bullish() {
  tf=$1
  divergence --timeframe $tf \
    && alert --timeframe $tf --webhook $ALERT_BULLISH_DIVERGENCE "$tf bullish divergence"
}

# Check for bearish divergence
divergence_bearish() {
  tf=$1
  divergence --timeframe $tf \
    && alert --timeframe $tf --webhook $ALERT_BEARISH_DIVERGENCE "$tf bearish divergence"
}
