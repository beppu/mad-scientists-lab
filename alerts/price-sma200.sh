#!/bin/bash

[ -e .env ] && eval $(sed 's/^/export /' .env)

export TA_EXCHANGE=${TA_EXCHANGE:-$1}
export TA_MARKET=${TA_MARKET:-$2}
export TA_TIMEFRAME=${TA_TIMEFRAME:-$3}

export ALERT_BULLISH_PRICE=${ALERT_BULLISH_PRICE:-"http://localhost:5000/hooks/alert-bullish-price"}
export ALERT_BEARISH_PRICE=${ALERT_BEARISH_PRICE:-"http://localhost:5000/hooks/alert-bearish-price"}


price --gt sma 200 && alert "Price above $TA_TIMEFRAME SMA 200" --webhook $ALERT_BULLISH_PRICE
price --lt sma 200 && alert "Price below $TA_TIMEFRAME SMA 200" --webhook $ALERT_BEARISH_PRICE
