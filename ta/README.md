# ta

The Unix Philosophy meets Technical Analysis

## Imagine this filesystem structure

```sh
bin/ta
bin/sma -> bin/ta
bin/ema -> bin/ta
bin/price -> bin/ta                # same as price.c for close
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
sma 50 .gt sma 200
sma 50 .gt 200       # same thing -- if command is omitted, previous command is assumed

# Is the previous candle of the sma less than the previous 200 sma
sma -i 1 50 .lt 200

# A golden cross could then be expressed as
# -i is used to index the candles with the newest candle being 0 and 1 being the previous candle and 2 the candle before that.
# -i will carry forward until explicitly reset
sma -i 1 50 .lt 200 .and sma -i 0 50 .gt 200

# What about providing a short-hand?
golden-cross
golden-cross --ema # to use EMA 50/200 instead of SMA 50/200

# To be consistent with the Unix philosophy, I should be able to consume STDIN too.
sma 50 < prices.json
sma 200 < prices.csv

# Is the (closing) price greater than the 50 sma?
price   .gt sma 50
price.c .gt sma 50   # same thing
```

## Implementation

This may need a little evaluation engine. The expression from the command line
needs to become an executable data structure. I need to turn infix into postfix.
I need precedence rules. `.lt` needs to bind tighter than `.and`.  Gah.

What have I gotten myself into? A supremely flexible CLI is nice, but I *fear* I
don't have the time to do it. Special purpose scripts would solve my immediate
problem and require far less effort than this more clever approach.

## Imagine something dumber but easier to write

```sh
price --gt sma 200
price --lt ema 200
sma-aligned 50 100 200 # for the bullish posture
sma-aligned 200 100 50 # for the bearish posture
golden-cross
bearish-divergence -t 1d ETH/BTC
bullish-divergence -t 1d ETH/BTC
```

I think I'm going to go with the dumb but effective way.  I'm going to keep most of
the same options and environment variables though.
