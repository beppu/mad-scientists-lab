const {DateTime} = require('luxon')
const time = require('./time')

test("timeframe boundaries must be calculated using the UTC timezone", () => {
  const isBoundary = time.isTimeframeBoundary('1d', DateTime.fromISO('2020-04-06T17:00:00-07:00')) // pipeline.aggregatorFn needed this
  expect(isBoundary).toBe(true)
})
