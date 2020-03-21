# Strategies

Strategies in this system should be pure functions that take market state and return an array of trades to execute.
Strategies should not rely on external data or make asynchronous calls during their execution.
Doing so could make backtesting unpredictable.

## Initialization

Strategies should be structured such that they export an initialization function
that takes a `baseTimeframe`, and a `config`. This `config` object will have at
minimum the following data in it:

* balance - The amount of money to start with
* logger - A [pino](https://github.com/pinojs/pino) logger for logging during strategy execution

The config is allowed to have more arbitrary data, which can be loaded via `bin/backtest --config`.

The initialization function should return an array with two values:

1. `indicatorSpecs` - This tells the system what indicators you want on what timeframes.
2. `strategy` - This is the initialized strategy function that will consume market state and make trading decisions.

## Examples

TODO
