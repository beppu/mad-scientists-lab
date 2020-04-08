const highLow = require('./highLow')
const kindOf = require('kind-of')

test("highLow should export a detect function", () => {
  expect(kindOf(highLow.detect)).toBe('function')
})

// I need a lot of candle data to test this.
