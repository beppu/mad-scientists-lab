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

guppy_green() {
  $tf=$1
  guppy --timeframe $tf --green \
    && alert --timeframe $tf --webhook $ALERT_BEARISH_ALIGNED "Guppy EMAs have turned turned green"
}

guppy_gray() {
  $tf=$1
  guppy --timeframe $tf --gray \
    && alert --timeframe $tf --webhook $ALERT_BEARISH_ALIGNED "Guppy EMAs have turned turned gray"
}

guppy_red() {
  $tf=$1
  guppy --timeframe $tf --red \
    && alert --timeframe $tf --webhook $ALERT_BEARISH_ALIGNED "Guppy EMAs have turned turned red"
}
