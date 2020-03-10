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
death-cross
bearish-divergence -t 1d ETH/BTC
bullish-divergence -t 1d ETH/BTC
```

I think I'm going to go with the dumb but effective way.  I'm going to keep most of
the same options and environment variables though.

# Blog

## 2020-03-10 Progress on Automated Trading

Almost out of necessity, I've started taking auotmated trading more seriously in
the last two weeks.  I still believe that strategy should be a function, and as of
today, I've built the subsystem that can feed these strategy functions data.  This
should be sufficient for backtesting strategies, and it's also a good foundation to
build a forward testing and live trading system as well.

I've done so much since the last entry

- Out of necessity, I can do streaming indicator calculations now.
- Candle aggregation is working
- Streaming indicator calculation while aggregating candles is working.
- I've learned how to use jest for unit tests.

Tangentially related,

- I can detect divergence.
- I can detect Guppy EMA color changes.
- I can calculate EMA and RSI without talib.  (For EMA, I still use it for the initial values, but I don't have to.)

I have most of what I need to start writing strategies.  However, one big missing
piece is a simulated exchange that takes signals from the strategy and executes paper trades.
That should be my next priority -- a simulated exchange.

This makes me think about state.

The state that pipeline.mainLoopFn calculates represents the state of the market.
However, a strategy can have its own state.  As the market moves, the strategy may change
biases between long and short.  It can also decide to place an order, and the order may or
may not fill.  The exchange needs to give feedback back to the strategy about order status.
If an order is filled, a strategy may then employ a substrategy for closing the open position.
Thus, a strategy could have a lot of state of its own.

```
[orders, strategyState] = strategy(strategyState, marketState)
```

It would be cool if I could step through a strategy as if I were debugging it.  I'd like to know
when it makes the decisions it does and why by examining the state at that instant in time.

## 2020-01-11 How Should Trade Execution Engine Work?

I have this recurring thought that analysis and trade execution is just a pure
function against price that implements rules for buying and selling. Another
recurring thought that I have is that the analysis functions that are living
inside various bin/* scripts should be refactored into a library of reusuable
code, but I'm not quite sure how that should look.

The command line tools present a nice common interface though, and maybe I should
follow their lead.  Many of the tools have the following modes of operation:

* The default is to check if a criteria state change happened on the current candle.
* `--now` -- This checks if the criteria is true.  (This allows the criteria to become true in the past.)
* `--scan` -- This goes back in time to find the moments when the criteria was true.

These are all generally useful modes, and maybe the library form of this code
should continue providing these modes.

I should also probably study how TradingView implements trading strategies. I
learned so much from them by adapting their data structures for the analysis
side, that I could certainly learn something from their trade execution side
too.

## 2019-09-23 Much Has Happened

### First, some respect

Before I forget, I want to give a lot of credit to TradingView and Pine Script
for their data model. In their system, they provide series data as arrays where
index 0 represents the most recent candle and higher indexes go back in time.
Common examples include `open`, `high`, `low` and `close` which are arrays in
Pine Script. In my own code, I call this `invertedMarketData`, and this style of
organization is what makes it so much easier to work with prices and indicator
output. When everything shares the same origin with 0 meaning the present, the
programmer is freed from having to do extra math to correlate indicator values
to their candlestick.

### Second, something useful

I implemented price and aligned. Then, I realized that align was a superset of
all the cross scripts, so I don't have to implement them. All that's left is
divergence (which is my favorite weapon). However, even without divergence, I
can become aware of many interesting changes in market structure.

The next problem to solve is to organize and run my collection of alerts. I have
some unixy ideas that I'm playing with now. It is so refreshing for me to go
back to my Unix roots. The CLI is my favorite UI by far, and thank God I don't
have to cater to anyone else.  I forgot what that felt like.
