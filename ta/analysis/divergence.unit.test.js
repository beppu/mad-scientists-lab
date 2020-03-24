const divergence = require('./divergence')
const kindOf = require('kind-of')

test("functions for detecting regular divergence should exist", () => {
  expect(kindOf(divergence.regularBullish)).toBe('function')
  expect(kindOf(divergence.regularBearish)).toBe('function')
})

// TODO: Testing this for real will require lots of fixture data.
// 1d candles from BitMEX's BTC/USD market should work.
