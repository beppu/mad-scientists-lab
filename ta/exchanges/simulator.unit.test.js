const simulator = require('./simulator')
const kindOf = require('kind-of')

test("simulator.create should return a function", () => {
  const sx = simulator.create({})
  expect(kindOf(sx)).toBe('function')
})

test("a buy-market order should fill immediately", () => {
})

test("a sell-market order should fill immediately", () => {
})
