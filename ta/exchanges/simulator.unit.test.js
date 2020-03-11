const simulator = require('./simulator')
const kindOf = require('kind-of')

test("simulator.create should return a function", () => {
  const sx = simulator.create({})
  expect(kindOf(sx)).toBe('function')
})

test("A simulator function called with all parameters undefined should return a pristine exchange state", () => {
  const sx = simulator.create({ balance: 200000 })
  let [state, actions]  = sx(undefined, undefined, undefined)
  expect(state).toMatchObject({
    limitOrders: [],
    stopOrders: [],
    marketOrders: [],
    position: 0,
    balance: 200000
  })
  expect(actions).toMatchObject([])
})

test("orders should show up in the simulator state and NOT EXECUTE if no candle is given", () => {
  const sx = simulator.create({})
  const orders = [
    {
      type: 'limit',
      action: 'buy',
      quantity: 10000,
      price: 7600
    },
    {
      type: 'limit',
      action: 'sell',
      quantity: 10000,
      price: 8600
    },
    {
      type: 'market',
      action: 'sell',
      quantity: 10000
    },
    {
      type: 'stop-market',
      action: 'sell',
      quantity: 10000
    },
    {
      type: 'stop-limit',
      action: 'sell',
      quantity: 10000,
      price: 7750,
      stopPrice: 7700
    },
  ]
  let [state, actions] = sx(undefined, orders, undefined)
  expect(state.limitOrders).toHaveLength(2)
  expect(state.marketOrders).toHaveLength(1)
  expect(state.stopOrders).toHaveLength(2)
})

test("market orders should fill immediately when a candle is given", () => {
  const sx = simulator.create({ balance: 100000 })
  const orders = [
    {
      type: 'market',
      action: 'buy',
      quantity: 10
    }
  ]
  let [state, actions] = sx(undefined, orders, undefined)
  expect(state.marketOrders).toHaveLength(1)
  let [state2, actions2] = sx(state, undefined, [0, 7000, 7100, 6990, 7010, 10000])
  expect(state2.marketOrders).toHaveLength(0)
  expect(actions2).toHaveLength(1)
  expect(state2.balance).toBe(30000)
  expect(state2.position).toBe(10)
})

test("limit orders should fill when their price is reached", () => {
  const sx = simulator.create({ balance: 100000 })
  const orders = [
    {
      type: 'market',
      action: 'buy',
      quantity: 10
    }
  ]
  const limitOrders = [
    {
      type: 'limit',
      action: 'sell',
      quantity: 5,
      price: 7900
    }
  ]
  let candles = [
    [0, 7000, 7100, 6990, 7010, 10000],
    [1, 7010, 8000, 7000, 7900, 10000]
  ]
  let r = sx(undefined, orders, candles[0])
  expect(r[1]).toHaveLength(1)
  let r2 = sx(r[0], limitOrders, candles[1])
  //console.log(r2)
  expect(r2[0].limitOrders).toHaveLength(0)
  expect(r2[1]).toHaveLength(1)
})
