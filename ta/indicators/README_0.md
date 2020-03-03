# Indicators

## How to ask for an indicator

```js
[ 'rsi' ]                                  // RSI with default settings
[ 'rsi', { period: 14, source: 'close' } ] // RSI with parameters
[ 'rsi', 14, 'close' ]                     // An abbreviated, positional form would be nice
[ 'sma', 20 ]                              // Another abbreviated example
```

## The implies the following

* Indicators must advertise their parameters similar to how talib does.
* I noticed that talib is a lot more flexible than I had in mind for my own.
* I'm going to stick with my simplified approach that makes more assumptions.
* If I need something more specific, I can make another similar indicator that makes those assumptions.

### talib example

```js
talib.explain('SMA')
{
  name: 'SMA',
  group: 'Overlap Studies',
  hint: 'Simple Moving Average',
  inputs: [ { name: 'inReal', type: 'real' } ],
  optInputs: [
    {
      name: 'optInTimePeriod',
      displayName: 'Time Period',
      defaultValue: 30,
      hint: 'Number of period',
      type: 'integer_range'
    }
  ],
  outputs: [ { '0': 'line', name: 'outReal', type: 'real', flags: {} } ]
}
```

* In my case, inputs is always invertedMarketData.
* optInputs are the parameters I'm passing in.
* outputs don't have to be exposed for me.  They'd be written to invertedMarketData on a predictable key.

## Initial Parameter Spec

Let's do a subset of talib.

* name
* optInputs

Furthermore, `optInputs` only needs `name`, `defaultValue`, and `type`.

## What do I get back?

Suppose I ask for:

```js
['rsi']
```

That would probably translate into this behind the scenes:

```js
let rsi = indicators['rsi'].init(parameters)
```

This `rsi` function should take an `invertedMarketData` struct and return a new `invertedMarketData` with its data written into it.

The `ta.id` object already has a lot of indicators in it.  The functions in that object are for taking `marketData` (not inverted yet)
and feeding it into talib.


# The Initial Spec

The spec

```js
$indicator.spec = {
  name: 'Name',
  optInputs: [
    {
      name: 'period',
      type: 'integer_range',
      defaultValue: 9
    }
  ]
}
```

The init function generates another function

```js
$indicator.init = (params) => {
  return function(imd) {
  }
}
```

