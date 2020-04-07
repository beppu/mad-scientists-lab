const highLow = require('./highLow')
const kindOf = require('kind-of')

test("highLow should export a bias function", () => {
  expect(kindOf(highLow.bias)).toBe('function')
})

// I need a lot of candle data to test this.
