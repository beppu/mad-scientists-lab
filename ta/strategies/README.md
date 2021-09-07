# Strategies

Strategies are functions that take `marketState` and `executedOrders` and return an array of `orders` when trade execution criteria is met.
Strategies should not rely on external data or make asynchronous calls during their execution.
Doing so could make backtesting unpredictable.

Strategies should be pure in the functional sense.
A strategy that's given the same series of price data should return the same series of orders every time.

## Initialization

Strategies should be structured such that they export an initialization function
that takes a `baseTimeframe`, and a `config`. This `config` object will have at
minimum the following data in it:

* balance - The amount of money to start with
* logger - A [pino](https://github.com/pinojs/pino) logger for logging during strategy execution

The config is allowed to have more arbitrary data, which can be loaded via `bin/backtest --config`.

The initialization function should return an array with two values:

1. `indicatorSpecs` - This tells the system what indicators you want on what timeframes.
2. `strategy` - This is the initialized strategy function that will consume `marketState` and `executedOrders` and make trading decisions by returning an `orders` array.


## Using Reusable State Machines

As of early September 2021, a reusable state machine was introduced that
dramatically reduces the amount of code needed to implement a strategy. The
first one can be found in `strategies/marketStrategy.js`, and it is a state
machine that generalizes the concept of a a strategy that enters and exits
positions using market orders. All a strategy has to do is implement a few
functions that tell it **WHEN** to buy and sell, and the state machine will
figure out how to execute the strategy's intent.

```js
// An example of how to marketStrategy
const clone    = require('clone')
const uuid     = require('uuid')
const outdent  = require('outdent')
const analysis = require('../analysis')
const time     = require('../time')
const utils    = require('../utils')

const marketStrategy = require('./marketStrategy')

module.exports = marketStrategy.create({
  defaultSpecs,  // Pass it various functions and data to customize it!
  defaultConfig, // Pretend we defined them above.
  allowedToLong, // See MM.js for a concrete example.
  allowedToShort,
  shouldTakeProfit,
  getStopPrice,
  gnuplot
})
```


## List of Strategies

### HeikinAshi

This is the original somewhat profitable strategy that simply market buys on green candles and market sells on red candles.

### HeikinAshi\_00

This introduces the following new ideas.

* EMAs to dictate whether the strategy is allowed to long or short.
* considering heikin ashi candles with wicks on the top and bottom to be "indecisive"

### HeikinAshi\_01

This is a copy of HeikinAshi\_00 with a few new features.

* static stop losses at entry time

**backtest**

```sh
bin/backtest --exchange bybit --market BTC/USD --timeframe 1m \
  --strategy HeikinAshi_01 --config cfg.btc-30m.json \
  --start-processing-at 2021-06-01 --begin 2021-07-01 --end 2021-07-07 \
   -v --gnuplot --balance 500000 --pnl-timeframe 4h
```

**gnuplot**

```gnuplot
set grid
set xdata time
set xtics scale 5,1 format "%F\n%T" rotate
set timefmt "%Y-%m-%dT%H:%M:%S"
set y2tics
set boxwidth 0.9 relative
plot [][32000:37000] "30m.data" skip 1300 using 1:7:8:9:10 title "BTC/USD Heikin Ashi" with candlesticks, \
  "" skip 1300 using 1:11 title "12 EMA" with line lw 2 lc rgb "green", \
  "" skip 1300 using 1:12 title "26 EMA" with line lw 3 lc rgb "red", \
  "orders.data" using 1:2:(stringcolumn(4) eq "buy" ? 9 : 11) title "Orders" with points pointsize 3 pt var lc rgb "orange", \
  "pnl.data" using 1:2 axes x1y2 title "Equity" with line lw 3 lc rgb "green"
```

I'm going to use this limited view of 1 week of trading to develop the behavioral changes I want.

### HeikinAshi\_02

With this one, I want to add the follwing new features in addition to what HeikinAshi\_01 has.

* trailing stop losses

### HeikinAshi\_03

My first attempt at a trailing stop loss didn't help as much as I thought it would.  The problem
is that it still makes too many bad trades and throws away all its gains.  I think I'm going to
do something completely different for an exit strategy so that I can stay in good positions longer.
I think I'll stick with similar heikin ashi based entries, but I'm going to use the EMAs to keep
me in position until they cross.  I'm going to default to the 12 EMA and 26 EMA for now, but I may
also make those configurable in this iteration.

* hold position until EMAs cross.
* maybe implement a trailing stop loss slightly below the slow EMA.

### HeikinAshi\_04

New ideas:

- Replace EMA 12 and EMA 26 with HMA 55.

### HeikinAshi\_05

New ideas:

- Factor out the state machine into a reusable and customizable library

This is a clone of HeikinAshi\_04 that uses the new reusable and customizable state machine described
in `strategies/marketStrategy.js`.  Its behavior is exactly the same as HeikinAshi\_04, but the amount
of code required to implement it is much less.

### MM

This is a completely new strategy that uses very long HMAs (330 and 440) for trend analysis while
using a higher timeframe Bollinger Band to help with entry timing.  The default timeframes are 4h and 1d
for trend analysis and entry timing.  This also uses the new reusable state machine as will most new
strategies going forward.

Note that in the interest of implementing something quickly, this strategy only longs and does not short.
I might want to keep it that way so that I can be nostalgic about it later, and do refinements in a new
strategy.

New ideas:

- Use long period HMAs and higher timeframe analysis together.
- This is also the first strategy that can emit its own `main.gpi` gnuplot script along with the backtest results.
