#!/bin/bash

export TA_EXCHANGE=${1:-binance}
export TA_MARKET=${2:-BTC/USDT}
export TA_TIMEFRAME=${3:-1d}
export WEBHOOK=${3:-"http://localhost:5000/hooks/alert-small"}
export ALERT_BULLISH_ALIGNED=${ALERT_BULLISH_ALIGNED:-"http://localhost:5000/hooks/alert-bullish"}
export ALERT_BEARISH_ALIGNED=${ALERT_BEARISH_ALIGNED:-"http://localhost:5000/hooks/alert-bearish"}

# ema 34 & 68
aligned ema 34 68 \
  && alert --webhook $ALERT_BULLISH_ALIGNED "34/68 EMA cross up"
aligned ema 68 34 \
  && alert --webhook $ALERT_BEARISH_ALIGNED "34/68 EMA cross down"

# sma 34 & 68
aligned sma 34 68 \
  && alert --webhook $ALERT_BULLISH_ALIGNED "34/68 SMA cross up"
aligned sma 68 34 \
  && alert --webhook $ALERT_BEARISH_ALIGNED "34/68 SMA cross down"
