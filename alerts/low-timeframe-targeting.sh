#!/bin/bash

export TA_EXCHANGE=${1:-binance}
export TA_MARKET=${2:-BTC/USDT}
export WEBHOOK=${3:-"http://localhost:5000/hooks/alert-small"}
export ALERT_BULLISH_ALIGNED=${ALERT_BULLISH_ALIGNED:-"http://localhost:5000/hooks/alert-bullish"}
export ALERT_BEARISH_ALIGNED=${ALERT_BEARISH_ALIGNED:-"http://localhost:5000/hooks/alert-bearish"}

# 3m alignment
aligned --timeframe 3m sma 50 100 200 \
  && alert --timeframe 3m --webhook $ALERT_BULLISH_ALIGNED "50/100/200 SMA in bullish alignment"
aligned --timeframe 3m sma 200 100 50 \
  && alert --timeframe 3m --webhook $ALERT_BEARISH_ALIGNED "50/100/200 SMA in bearish alignment"

# sma 200 on 3m
price --timeframe 3m --gt sma 200 \
  && alert --timeframe 3m --webhook $WEBHOOK "Price above 200 SMA"
price --timeframe 3m --lt sma 200 \
  && alert --timeframe 3m --webhook $WEBHOOK "Price below 200 SMA"
