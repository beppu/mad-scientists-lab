const Scalper = require('./Scalper')
const kindOf = require('kind-of')

test("a strategy when initialized should return its indicatorSpecs and a strategy function", () => {
  const [indicatorSpecs, strategy] = Scalper('1h', { balance: 100000 })
  expect(indicatorSpecs).toMatchObject({ "1h": [] })
  expect(kindOf(strategy)).toBe('function')
})
