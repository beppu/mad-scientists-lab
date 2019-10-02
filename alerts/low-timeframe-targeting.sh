#!/bin/bash

export TA_EXCHANGE=${1:-binance}
export TA_MARKET=${2:-BTC/USDT}
export TA_TIMEFRAME=${3:-5m}
export ALERT_SMALL=${ALERT_SMALL:-"http://localhost:5000/hooks/alert-small"}
export ALERT_BULLISH_ALIGNED=${ALERT_BULLISH_ALIGNED:-"http://localhost:5000/hooks/alert-bullish"}
export ALERT_BEARISH_ALIGNED=${ALERT_BEARISH_ALIGNED:-"http://localhost:5000/hooks/alert-bearish"}

echo "> analyzing $TA_EXCHANGE + $TA_MARKET on $TA_TIMEFRAME timeframe"

# 50/100/200 alignment
aligned sma 50 100 200 \
  && alert --webhook $ALERT_BULLISH_ALIGNED "$TA_TIMEFRAME 50/100/200 SMA in bullish alignment"
aligned sma 200 100 50 \
  && alert --webhook $ALERT_BEARISH_ALIGNED "$TA_TIMEFRAME 50/100/200 SMA in bearish alignment"

# price vs sma 200
price --gt sma 200 \
  && alert --webhook $ALERT_SMALL "Price above $TA_TIMEFRAME 200 SMA"
price --lt sma 200 \
  && alert --webhook $ALERT_SMALL "Price below $TA_TIMEFRAME 200 SMA"

