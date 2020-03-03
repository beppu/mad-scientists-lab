# Indicators

Since writing out my thoughts in [README\_0.md](README_0.md) and implementing my ideas,
I've realized the following:

* Brute force calculation slows down as the data set increases in size to the point where it's too slow to use.
  * Luckily, I've figured out how to do streaming calculations.
* The indicators must also be able to recalculate their values for an unfinished candle over the course of its lifetime.
* I don't (yet) need indicators to publish their parameter specs, so I can eliminate that requirement.

## Initialization

### Declarative Style

Strategies will use this style when declaring what indicators they want.

```javascript
[ 'rsi', 14 ]
```

### In Code

This time, we return two functions instead of one.

```javascript
const [rsiCalculate, rsiRecalculate] = rsi(14)
```

### Internal Usage

```javascript
const [rsiCalculate, rsiRecalculate] = rsi(14)

// run calculate to start things off (without passing in state)
let state = rsiCalculate(md, imd) 

while (sameCandle) {
  // recalculate *REPLACES* values instead of pushing new values onto md and imd.
  // Also, keep reusing the same state when recalculating.
  rsiRecalculate(md, imd, state)
}

// brand new candles should run calculate with state and capture a new state
state = rsiCalculate(md, imd, state) 
```

Use the calculate function whenever a new candle is needed.  The very first run and when you're on a timeframe boundary
are when you use calculate.

Use the recalculate function at all other times, because unfinished candles will need recalculation as new data arrives.
