# Exchanges

The code under `exchanges/` is responsible for the following.

* Realtime candle retrieval.
* Order execution

## Candle Retrieval

If possible, an exchange's WebSocket API should be used to fetch high resolution candles (1m or less) and
prepare it the data pipeline that does candle aggregation, indicator calculation, and strategy execution.

## Order Execution

Orders are returned by strategy functions as inert JavaScript objects that have a flat structure.

### Market Orders

```js
{
  type: 'market',
  action: 'buy', // or 'sell'
  quantity: 10000
}
```

The pair that's being traded (like 'BTC/USD') is inferred through the strategy's configuration, and the
strategy's code is not responsible for including it.  This lets strategies focus on buy/sell decision-making.

### Limit Orders

```js
{
  type: 'limit',
  action: 'buy', // or 'sell'
  quantity: 10000,
  price: 9000
}
```

Upon execution, a limit order is placed in the order book.  Should `price` be reached, the exchange will fill the order
according to their internal rules.

### Stop Market Orders

```js
{
  type: 'stop-market',
  action: 'sell', // or 'buy'
  quantity: 10000,
  price: 8950
}
```

If `price` is reached, a market order is performed by the exchange.
