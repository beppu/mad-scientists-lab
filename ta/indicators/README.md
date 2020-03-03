# Indicators

Since writing out my thoughts in [README\_0.md](README_0.md) and implementing my ideas,
I've realized the following:

* Brute force calculation slows down as the data set increases in size to the point where it's too slow to use.
* Maybe I could have used a large window size (like 1000 candles), but that's still very inefficient.
* Luckily, I've figured out how to do streaming calculations.
* The indicators must also be able to recalculate their values for an unfinished candle over the course of its lifetime.
* I don't (yet) need indicators to publish their parameter specs, so I can eliminate that requirement.

With this new understanding, the indicator API was redesigned to facilitate streaming and recalculation.

## Initialization

### Declarative Style

Strategies will use this style when declaring what indicators they want.

```javascript
[ 'rsi', 14 ]
```

There's no constraint on the type signatures for indicator initialzing functions, so indicator authors
should feel free to pass any inert data they want to these functions.  Anything JSON serializable is
fair game.

Here I use a single number `14`, but it could be anything JSON serializable for another indicator.
You can have more than one parameter too.

### In Code

The above `['rsi', 14]` declaration would translate to the following.
This time, we return two functions instead of one.

```javascript
const [rsiCalculate, rsiRecalculate] = rsi(14)
```

### Internal Usage

```javascript
const [rsiCalculate, rsiRecalculate] = rsi(14)

// Run calculate to start things off (without passing in state).
let state = rsiCalculate(md, imd) 

while (sameCandle) {
  // Recalculate REPLACES values instead of pushing new values onto md and imd.
  // Also, keep reusing the same state when recalculating.
  rsiRecalculate(md, imd, state)
}

// Brand new candles should run calculate with state and capture a new state.
// This inserts new data into imd as a side effect.
state = rsiCalculate(md, imd, state) 

// 2020-03-03:  A better name for these functions might be rsiInsert and rsiUpdate.
```

Use the calculate function whenever a new candle is needed.  The very first run and when you're on a timeframe boundary
are when you use calculate.

Use the recalculate function at all other times, because unfinished candles will need recalculation as new data arrives.

### Key Naming in `invertedMarketData`

#### Non-default Period

```javascript
const key = `rsi${period}`
```

#### Default Period

```javascript
const key = `rsi`
```

RSI will use a default period of 14, and Bollinger Bands will use a default
period of 20. To provide easy access to these values in `invertedMarketData`, I
won't use a suffix in their key names. However moving averages, will not have
any default period, and they will always have a suffix in their key names.


## Notes on State

One thing I'm moving away from is hiding state inside of a closure. Originally,
I had tried it this way for streaming, but doing so prevents me from doing
recalculation because each call of the closure mutates internal hidden state
whereas I want to recalculate using the same state I used before. Recalculation
of an unfinished candle is like being hypothetical. What if the candle closed
like this? Recalculation is exploring possibilities before a candle is finished.

The new model is to return state as an object so that the caller can choose to
reuse it or not at the caller's discretion. This lets me be hypothetical.

## Notes on Initial Set of Indicators

### rsi.js

RSI was the first indicator to implement the new streaming API. Since it uses
Wilder's SMMA which is very similar to an EMA in how it's calculated, it really
wanted a streaming implementation for both speed and accuracy.

### ema.js

This will be the next one to get the streaming treatment, because the way EMA is
calculated makes it desirable for speed and accuracy.

### sma.js and bbands.js

These don't need a streaming implementation, because the data requirements for
their calculations are constrained by their period lengths + 1. For the sake of
my developer time, I can continue to use talib to calculate this without
sacrificing accuracy. The sacrifice in speed relatively small too.  They will
support the streaming API, but their internal implementation will continue to
use talib for now.
