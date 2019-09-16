# ta

The Unix Philosophy meets Technical Analysis

## Imagine this filesystem structure

```sh
bin/ta
bin/sma -> bin/ta
bin/ema -> bin/ta
bin/price.o -> bin/ta
bin/price.h -> bin/ta
bin/price.l -> bin/ta
bin/price.c -> bin/ta
bin/golden-cross -> bin/ta
```

bin/ta is the only actual script.
argv[0] is introspected to find the actual command.

## Imagine this workflow

```sh
# Print the SMA values I guess.
sma -x binance -m BTC/USDT -t 1d 50

# Use environment variables to set default exchange, market, and timeframe
export TA_EXCHANGE=binance
export TA_MARKET=BTC/USDT
export TA_TIMEFRAME=1d

# Is the 50 sma greater than the 200 sma
sma 50 --gt 200

# Is the previous candle of the sma less than the previous 200 sma
sma -i 1 50 --lt 200

# A golden cross could then be expressed as
sma -i 1 50 --lt 200 && sma 50 --gt 200

# It's really inefficient, because it loads data over and over again.
# - One solution is to not solve it, because I can spare the computational resources.
# - Another is to have a caching data daemon

# - Another solution is to expand what the command line can express
#   `.and` lets bin/ta handle the comparison internally and not have to load the same candles twice
sma -i 1 50 --lt 200 .and sma 50 --gt 200

# What about providing a short-hand?
golden-cross
golden-cross --ema # to use EMA 50/200 instead of SMA 50/200

# To be consistent with the Unix philosophy, I should be able to consume STDIN too.
sma 50 < prices.json
sma 200 < prices.csv
```