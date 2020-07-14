const LimitFill = require('./LimitFill')
const kindOf = require('kind-of')

test("LimitFill should export an init function", () => {
  expect(kindOf(LimitFill.init)).toBe("function")
})

test("Calling Limitfill.init should return a microstrategy function", () => {
  const [indicatorSpecs, microStrategy] = LimitFill.init({})
  expect(kindOf(microStrategy)).toBe("function")
})

test("LimitFill should issue a limit buy order when asked", () => {
})

test("LimitFill should move the price up if the order isn't filled within the allotted time", () => {
})

test("LimitFill should be able to handle a partial fill", () => {
})

test("LimitFill should use a market order if price moves beyond the configured threshold", () => {
})
