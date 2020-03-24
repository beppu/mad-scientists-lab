const guppy = require('./guppy')
const kindOf = require('kind-of')

test("guppy should export the EMA periods it requires", () => {
  expect(kindOf(guppy.fastEMAs)).toBe('array')
  expect(kindOf(guppy.slowEMAs)).toBe('array')
  expect(kindOf(guppy.allEMAs)).toBe('array')
})

test("guppy should export color change detection functions", () => {
  expect(kindOf(guppy.haveSlowEMAsTurnedColor)).toBe('function')
  expect(kindOf(guppy.isSlowEMAColoredNow)).toBe('function')
})

// TODO: Testing this for real will require lots of fixture data.
// 1d candles from BitMEX's BTC/USD market should work.
