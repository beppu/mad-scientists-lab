const LimitFill = require('./LimitFill')
const kindOf = require('kind-of')

test("LimitFill should export an init function", () => {
  expect(kindOf(LimitFill.init)).toBe("function")
})

test("Calling Limitfill.init should return a microstrategy function", () => {
  const microStrategy = LimitFill.init({})
  expect(kindOf(microStrategy)).toBe("function")
})
