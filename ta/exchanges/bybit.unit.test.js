const bybit = require('./bybit')
const eventLog = require('../tests/fixtures/bybit.websocket.json')
const kindOf = require('kind-of')
const Lazy = require('lazy.js')

// TODO - Use captured events as fixtures for websocket data

test("bybit driver object should contain keys limits, fees, Driver", () => {
  expect(kindOf(bybit.limits)).toBe('object')
  expect(kindOf(bybit.fees)).toBe('object')
  expect(kindOf(bybit.Driver)).toBe('function')
})

test("transformExchangeEvents should record new orders internally", () => {
  const bb = new bybit.Driver({})
  const oc = eventLog[0] // order creation recognized
  const id = oc.data[0].order_id
  const r0 = bb.transformExchangeEvents(oc)
  expect(kindOf(bb.exchangeState)).toBe('object')
  expect(kindOf(bb.exchangeState.orders)).toBe('object')
  expect(kindOf(bb.exchangeState.orders[id])).toBe('object')
})

test("transformExchangeEvents should acknowledge the creation of a new order", () => {
  const bb = new bybit.Driver({})
  const oc = eventLog[0] // order creation recognized
  const id = oc.data[0].order_id
  const r0 = bb.transformExchangeEvents(oc)
  expect(kindOf(r0)).toBe('array')
  expect(r0).toHaveLength(1)
  expect(kindOf(r0[0]._id)).toBe('string')
})

test("transformExchangeEvents should return filled order data on successful execution", () => {
  const bb = new bybit.Driver({})
  const oc = eventLog[0] // order creation recognized
  const id = oc.data[0].order_id
  const r0 = bb.transformExchangeEvents(oc) // market order creation
  const r1 = bb.transformExchangeEvents(eventLog[1]) // actual execution
  expect(kindOf(r1)).toBe('array')
  expect(r1).toHaveLength(1)
  const ex = r1[0]
  expect(ex.status).toBe('filled')
  expect(ex.type).toBe('market')
  expect(kindOf(ex._)).toBe('object') // raw event data in case you need to debug
})

test("transformExchangeEvents should acknowledge the rejection of a new order", () => {
  // TODO
})

test("transformExchangeEvents should record new stop orders internally", () => {
  const bb = new bybit.Driver({})
  const oc = eventLog[7] // stop order creation recognized
  const id = oc.data[0].order_id
  const r0 = bb.transformExchangeEvents(oc)
  expect(kindOf(bb.exchangeState)).toBe('object')
  expect(kindOf(bb.exchangeState.stopOrders)).toBe('object')
  expect(kindOf(bb.exchangeState.stopOrders[id])).toBe('object')
})

test("transformExchangeEvents should acknowledge the creation of a new stop order", () => {
  const bb = new bybit.Driver({})
  const oc = eventLog[7] // order creation recognized
  const id = oc.data[0].order_id
  const r0 = bb.transformExchangeEvents(oc)
  expect(kindOf(r0)).toBe('array')
  expect(r0).toHaveLength(1)
  expect(kindOf(r0[0]._id)).toBe('string')
  expect(r0[0].type).toBe('stop-market')
})

test("transformExchangeEvents should return filled stop orders on successful execution", () => {
  const bb = new bybit.Driver({})
  const oc = eventLog[7] // order creation recognized
  const id = oc.data[0].order_id
  const r0 = bb.transformExchangeEvents(oc)
  //console.log(r0[0])
  const mc = eventLog[11] // conditionally create market order
  const r1 = bb.transformExchangeEvents(mc)
  //console.log(r1[0])
  const eo = eventLog[12] // execute market order
  const r2 = bb.transformExchangeEvents(eo)
  expect(kindOf(r2)).toBe('array')
  expect(r2).toHaveLength(1)
  const ex = r2[0]
  expect(ex.status).toBe('filled')
  expect(ex.type).toBe('stop-market')
  expect(kindOf(ex._)).toBe('object') // raw event data in case you need to debug
})

/*

  // REPL Snippets

  // navigate eventLog fixture
  eventLog = require('./tests/fixtures/bybit.websocket.json')
  eventLog.forEach((e, i) => console.log(`${i} ${e.topic}`))

 */
