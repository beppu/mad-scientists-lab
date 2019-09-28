#!/bin/bash

export TA_EXCHANGE=${1:-binance}
export TA_MARKET=${2:-BTC/USDT}
export WEBHOOK=${3:-"http://localhost:5000/hooks/alert-small"}
export ALERT_BULLISH_ALIGNED=${ALERT_BULLISH_ALIGNED:-"http://localhost:5000/hooks/alert-bullish"}
export ALERT_BEARISH_ALIGNED=${ALERT_BEARISH_ALIGNED:-"http://localhost:5000/hooks/alert-bearish"}

# ema 34 & 68
price --timeframe 5m --lt ema 34 \
  && alert --timeframe 5m --webhook $WEBHOOK "Price below 34 EMA"
price --timeframe 5m --lt ema 68 \
  && alert --timeframe 5m --webhook $WEBHOOK "Price below 68 EMA"
price --timeframe 5m --gt ema 34 \
  && alert --timeframe 5m --webhook $WEBHOOK "Price above 34 EMA"
price --timeframe 5m --gt ema 68 \
  && alert --timeframe 5m --webhook $WEBHOOK "Price above 68 EMA"
aligned --timeframe 5m ema 34 68 \
  && alert --timeframe 5m --webhook $WEBHOOK "34 EMA crossed above 68 EMA"
aligned --timeframe 5m ema 68 34 \
  && alert --timeframe 5m --webhook $WEBHOOK "34 EMA crossed below 68 EMA"

# ema 5 & 13
price --timeframe 5m --lt ema 5 \
  && alert --timeframe 5m --webhook $WEBHOOK "Price above 5 EMA"
price --timeframe 5m --lt ema 13 \
  && alert --timeframe 5m --webhook $WEBHOOK "Price below 13 EMA"
price --timeframe 5m --gt ema 5 \
  && alert --timeframe 5m --webhook $WEBHOOK "Price above 5 EMA"
price --timeframe 5m --gt ema 13 \
  && alert --timeframe 5m --webhook $WEBHOOK "Price below 13 EMA"
aligned --timeframe 5m ema 5 13 \
  && alert --timeframe 5m --webhook $WEBHOOK "5 EMA crossed above 13 EMA"
aligned --timeframe 5m ema 13 5 \
  && alert --timeframe 5m --webhook $WEBHOOK "5 EMA crossed below 13 EMA"
