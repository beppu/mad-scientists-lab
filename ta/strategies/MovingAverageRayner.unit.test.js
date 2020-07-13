const MovingAverageRayner = require('./MovingAverageRayner')
const kindOf = require('kind-of')

test("a strategy when initialized should return its indicatorSpecs and a strategy function", () => {
  const [indicatorSpecs, strategy] = MovingAverageRayner.init({ balance: 100000 })
  expect(indicatorSpecs).toMatchObject({ })
  expect(kindOf(strategy)).toBe('function')
})

test("the default indicatorSpecs should have 3 EMAs", () => {
  const [indicatorSpecs, strategy] = MovingAverageRayner.init({ balance: 100000 })
  expect(indicatorSpecs).toMatchObject({
    '2h': [ ['ema', 20], ['ema', 50], ['ema', 200] ]
  })
})
