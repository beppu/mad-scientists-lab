#!/bin/bash

export TA_EXCHANGE=${1:-binance}
export TA_MARKET=${2:-BTC/USDT}
export TA_TIMEFRAME=${3:-2h}
export WEBHOOK=${3:-"http://localhost:5000/hooks/alert-small"}
export ALERT_BULLISH_ALIGNED=${ALERT_BULLISH_ALIGNED:-"http://localhost:5000/hooks/alert-bullish"}
export ALERT_BEARISH_ALIGNED=${ALERT_BEARISH_ALIGNED:-"http://localhost:5000/hooks/alert-bearish"}

# ema 12 & 26
aligned ema 12 26 \
  && alert --webhook $ALERT_BULLISH_ALIGNED "12/26 EMA cross up"
aligned ema 26 12 \
  && alert --webhook $ALERT_BEARISH_ALIGNED "12/26 EMA cross down"

