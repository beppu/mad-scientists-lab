const MovingAverageSR = require('./MovingAverageSR')
const kindOf = require('kind-of')

test("a strategy when initialized should return its indicatorSpecs and a strategy function", () => {
  const [indicatorSpecs, strategy] = MovingAverageSR.init('1h', { balance: 100000 })
  expect(indicatorSpecs).toMatchObject({ "1h": [[ "sma", 20 ]] })
  expect(kindOf(strategy)).toBe('function')
})
