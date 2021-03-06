const DC = require('./DC')
const kindOf = require('kind-of')

test("a strategy when initialized should return its indicatorSpecs and a strategy function", () => {
  const [indicatorSpecs, strategy] = DC.init({ balance: 100000 })
  expect(indicatorSpecs).toMatchObject({ "1h": [ ['rsi'], ['bbands'] ] })
  expect(kindOf(strategy)).toBe('function')
})
