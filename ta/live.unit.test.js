const live = require('./live')

test("a trader should instantiate and have certain properties", () => {
  const exchange = 'bybit'
  const market = 'BTC/USD'
  const strategy = 'Guppy'
  if (process.env.OUTSIDE_USA) {
    const btcusd = new live.Trader({ exchange, market, strategy, options: {} })
    expect(btcusd).toBeDefined()
    expect(btcusd.opts).toMatchObject({ exchange, market, strategy })
    expect(btcusd.logger).toBeDefined()
  }
})

test("warming up a trader instance should work", () => {
  // TODO
})

test("switching a warmed up trader to realtime price data should work", () => {
  // TODO
})

test("trying to use an unsupported exchange should throw an exception", () => {
  // TODO
})
