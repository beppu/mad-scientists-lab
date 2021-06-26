const candles = require('./candles')
const kindOf = require('kind-of')

test("candles.ha should exist", () => {
  expect(kindOf(candles.ha)).toBe('object')
})

test("candles.ha.isBullish should correctly identify bullish heikin ashi candles", () => {
})

test("candles.ha.isBearish should correctly identify bearish heikin ashi candles", () => {
})

test("candles.ha.isNeutral should correctly identify neutral heikin ashi candles", () => {
})
