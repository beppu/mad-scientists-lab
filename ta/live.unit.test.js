const live = require('./live')

test("a Trader should instantiate and have certain properties", () => {
  const exchange = 'bybit'
  const market = 'BTC/USD'
  const strategy = 'Guppy'
  const btcusd = new live.Trader({ exchange, market, strategy, options: {} })
  expect(btcusd).toBeDefined()
  expect(btcusd.opts).toMatchObject({ exchange, market, strategy })
  expect(btcusd.logger).toBeDefined()
})

test("warming up a Trader instance should work", () => {
  // TODO
})

test("switching a warmed up Trader to realtime price data should work", () => {
  // TODO
})

test("Trying to use an unsupported exchange should throw an exception", () => {
  // TODO
})
