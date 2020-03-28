const BuyAndHold = require('./BuyAndHold')
const kindOf = require('kind-of')

test("a strategy when initialized should return its indicatorSpecs and a strategy function", () => {
  const [indicatorSpecs, strategy] = BuyAndHold('1h', { balance: 100000 })
  expect(indicatorSpecs).toMatchObject({ })
  expect(kindOf(strategy)).toBe('function')
})
