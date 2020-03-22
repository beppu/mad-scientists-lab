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

## Examples

TODO
