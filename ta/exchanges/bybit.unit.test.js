const bybit = require('./bybit')
const kindOf = require('kind-of')
const eventLog = require('../tests/fixtures/bybit.websocket.json')

// TODO - Use captured events as fixtures for websocket data

test("bybit driver object should contain keys limits, fees, Driver", () => {
  expect(kindOf(bybit.limits)).toBe('object')
  expect(kindOf(bybit.fees)).toBe('object')
  expect(kindOf(bybit.Driver)).toBe('function')
})

test("transformEvents should record new orders internally", () => {
  const bb = new bybit.Driver({})
})

test("transformEvents should record new stop orders internally", () => {
})

test("transformEvents should return filled order data on successful execution", () => {
})
