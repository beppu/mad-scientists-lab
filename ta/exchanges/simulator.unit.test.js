const simulator = require('./simulator')
const kindOf = require('kind-of')

test("simulator.create should return a function", () => {
  const sx = simulator.create({})
  expect(kindOf(sx)).toBe('function')
})

test("A simulator function called with all parameters undefined should return a pristine exchange state", async () => {
  const sx = simulator.create({ balance: 200000 })
  let [state, actions]  = await sx(undefined, undefined, undefined)
  expect(state).toMatchObject({
    limitOrders: [],
    stopOrders: [],
    marketOrders: [],
    position: 0,
    balance: 200000
  })
  expect(actions).toMatchObject([])
})

test("orders should show up in the simulator state and NOT EXECUTE if no candle is given", async () => {
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
      price: 8600,
      options: { reduceOnly: true }
    },
    {
      type: 'market',
      action: 'sell',
      quantity: 10000
    },
    {
      type: 'stop-market',
      action: 'sell',
      quantity: 10000,
      price: 7800
    },
    {
      type: 'stop-limit',
      action: 'sell',
      quantity: 10000,
      price: 7700
    },
  ]
  let [state, actions] = await sx(orders, undefined, undefined)
  expect(state.limitOrders).toHaveLength(2)
  expect(state.marketOrders).toHaveLength(1)
  expect(state.stopOrders).toHaveLength(2)
})

test("market orders should fill immediately when a candle is given", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
  const orders = [
    {
      type: 'market',
      action: 'buy',
      quantity: 10
    }
  ]
  let [state, actions] = await sx(orders, undefined, undefined)
  //console.log({state, actions})
  expect(state.marketOrders).toHaveLength(1)
  let [state2, actions2] = await sx(undefined, state, [0, 7000, 7100, 6990, 7010, 10000])
  expect(state2.marketOrders).toHaveLength(0)
  expect(actions2).toHaveLength(1)
  expect(state2.balance).toBe(30000)
  expect(state2.position).toBe(10)
})

test("limit orders should fill when their price is reached", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
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
      price: 8000,
      options: { reduceOnly: true }
    },
    {
      type: 'limit',
      action: 'sell',
      quantity: 5,
      price: 9400,
      options: { reduceOnly: true }
    },
  ]
  let candles = [
    [0, 7000, 7100, 6990, 7010, 10000],
    [1, 7010, 9500, 7000, 7900, 10000]
  ]
  let r = await sx(orders, undefined, candles[0])
  expect(r[1]).toHaveLength(1)
  let r2 = await sx(limitOrders, r[0], candles[1])
  //console.log(r2)
  const newBalance = r2[0].balance
  expect(r2[0].limitOrders).toHaveLength(0)
  expect(r2[1]).toHaveLength(2)
  expect(newBalance).toBeGreaterThan(balance)
})

test("short positions should be possible with market orders", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
  const shortOrders = [
    {
      type: 'market',
      action: 'sell',
      quantity: 10
    }
  ]
  const closeOrders = [
    {
      type: 'market',
      action: 'buy',
      quantity: 10
    }
  ]
  let candles = [
    [0, 7000, 7100, 6990, 7010, 10000],
    [1, 7010, 9500, 7000, 7900, 10000]
  ]
  let r = await sx(shortOrders, undefined, candles[0])
  //console.log(r[0])
  expect(r[0].position).toBeLessThan(0)
  let r2 = await sx(closeOrders, r[0], candles[1])
  //console.log(r2)
  expect(r2[0].balance).toBeLessThan(balance) // this trade should lose money
  expect(r2[1]).toHaveLength(1)
})

test("short positions should be possible with limit orders", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
  const shortOrders = [
    {
      type: 'limit',
      action: 'sell',
      quantity: 10,
      price: 9400
    }
  ]
  const closeOrders = [
    {
      type: 'limit',
      action: 'buy',
      quantity: 10,
      price: 8000
    }
  ]
  let candles = [
    [0, 7000, 9400, 6990, 9010, 10000],
    [1, 9010, 9500, 7000, 7900, 10000]
  ]
  let r = await sx(shortOrders, undefined, candles[0])
  expect(r[1]).toHaveLength(1)             // the short should be executed on this candle
  expect(r[0].limitOrders).toHaveLength(0)
  //console.log(r[0])
  let r2 = await sx(closeOrders, r[0], candles[1])
  expect(r2[1]).toHaveLength(1) // the previous short order and the take profit order should fill in the same candle
  expect(r2[0].balance).toBeGreaterThan(balance) // this should be a profitable short trade
  expect(r2[0].position).toBe(0) // we should have no position after all trades have executed
  //console.log(r2[0].balance, r2[0].position)
})

test("limit buys orders priced higher than the current price should be turned into market buys", async () => {
  // The purpose of this is to simulate BitMEX's behavior which I find very convenient especially in market that's moving very quickly.
  const balance = 100000
  const sx = simulator.create({ balance })
  const buyOrders = [
    {
      type: 'limit',
      action: 'buy',
      quantity: 1,
      price: 11000
    }
  ]
  let candles = [
    [0, 7000, 9400, 6990, 9010, 10000],
  ]
  // the limit buy order should turn into a market buy that fills immediately
  let r = await sx(buyOrders, undefined, candles[0])
  expect(r[1]).toHaveLength(1)
  expect(r[1][0].type).toBe('market')
  expect(r[1][0].oldType).toBe('limit')
})

test("limit sell orders that are lower than the current price should be turned into market sells", async () => {
  // The purpose of this is to simulate BitMEX's behavior which I find very convenient especially in market that's moving very quickly.
  const balance = 100000
  const sx = simulator.create({ balance })
  const sellOrders = [
    {
      type: 'limit',
      action: 'sell',
      quantity: 1,
      price: 4000
    }
  ]
  let candles = [
    [0, 7000, 9400, 6990, 9010, 10000],
  ]
  // the limit buy order should turn into a market buy that fills immediately
  let r = await sx(sellOrders, undefined, candles[0])
  //console.log(r)
  expect(r[1]).toHaveLength(1)
  expect(r[1][0].type).toBe('market')
  expect(r[1][0].oldType).toBe('limit')
  expect(r[1][0].fillPrice).toBeGreaterThan(0)
})

test("all sells that increase a position should adjust the averageEntryPrice", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
  let candles = [
    [0, 1000, 5000, 1000, 5000, 10000],
  ]
  const sellOrders = [
    {
      type: 'limit',
      action: 'sell',
      quantity: 1,
      price: 2000
    },
    {
      type: 'limit',
      action: 'sell',
      quantity: 2,
      price: 3000
    },
    {
      type: 'limit',
      action: 'sell',
      quantity: 3,
      price: 4000
    }
  ]
  const r = await sx(sellOrders, undefined, candles[0])
  const [absolutePosition, totalCost] = sellOrders.reduce((m, a) => {
    if (m.length) {
      return [m[0] + a.quantity, m[1] + (a.quantity * a.price)]
    } else {
      return [a.quantity, a.price]
    }
  }, [])
  const correctAverage = totalCost / absolutePosition
  expect(r[0].averageEntryPrice).toBe(correctAverage)
})

test("all buys that increase a position should adjust the averageEntryPrice", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
  let candles = [
    [0, 10000, 10000, 1000, 5000, 10000],
  ]
  const sellOrders = [
    {
      type: 'limit',
      action: 'buy',
      quantity: 1,
      price: 2000
    },
    {
      type: 'limit',
      action: 'buy',
      quantity: 2,
      price: 3000
    },
    {
      type: 'limit',
      action: 'buy',
      quantity: 3,
      price: 4000
    }
  ]
  const r = await sx(sellOrders, undefined, candles[0])
  const [absolutePosition, totalCost] = sellOrders.reduce((m, a) => {
    if (m.length) {
      return [m[0] + a.quantity, m[1] + (a.quantity * a.price)]
    } else {
      return [a.quantity, a.price]
    }
  }, [])
  const correctAverage = totalCost / absolutePosition
  expect(r[0].averageEntryPrice).toBe(correctAverage)
})

test("stop market orders should be able to close positions", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
  let candles = [
    [0, 10000, 10000, 1000, 5000, 10000],
  ]
  // This test intends to open a long position that gets stopped out before its target is hit.
  const orders = [
    {
      type: 'limit',
      action: 'buy',
      quantity: 1,
      price: 3000
    },
    /*
    {
      type: 'limit',
      action: 'sell',
      quantity: 1,
      price: 6000,
      options: { reduceOnly: true } // you need to have a position before putting in a reduceOnly order so this should've been rejected; make a separate test for this case.
    },
    */
    {
      type: 'stop-market',
      action: 'sell',
      quantity: 1,
      price: 2000
    }
  ]
  const [state, executedOrders] = await sx(orders, undefined, candles[0])
  expect(state.balance).toBe(balance - (orders[0].price - orders[1].price))
  expect(state.averageEntryPrice).toBe(0)
})

test("stop market orders should be able to open positions", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
  let candles = [
    [0, 10000, 10000, 1000, 5000, 10000],
  ]
  const orders = [
    {
      type: 'stop-market',
      action: 'sell',
      quantity: 1,
      price: 9000
    },
  ]
  const [state, executedOrders] = await sx(orders, undefined, candles[0])
  //console.log(state, executedOrders)
  expect(executedOrders).toHaveLength(1)
  expect(state.position).toBe(-orders[0].quantity)
  expect(state.balance).toBe(balance - orders[0].price * orders[0].quantity)
})

test("unexecuted orders should be editable", async () => {
  const balance = 100000
  const sx = simulator.create({ balance })
  const orders = [
    {
      group: 'test-orders',
      type: 'stop-market',
      action: 'sell',
      quantity: 1,
      price: 9000
    },
    {
      id: 'foo',
      type: 'stop-market',
      action: 'sell',
      quantity: 1,
      price: 9000
    },
    {
      group: 'test-orders',
      type: 'limit',
      action: 'buy',
      quantity: 1,
      price: 1000
    },
    {
      id: 'bar',
      type: 'limit',
      action: 'buy',
      quantity: 1,
      price: 900
    }
  ]
  const [s, x] = await sx(orders, undefined)
  //console.log(s)
  expect(s.limitOrders).toHaveLength(2)
  expect(s.stopOrders).toHaveLength(2)
  const edits = [
    {
      type: 'modify',
      action: 'cancel',
      id: 'foo'
    },
    {
      type: 'modify',
      action: 'cancel',
      group: 'test-orders'
    },
    {
      type: 'modify',
      action: 'update',
      id: 'bar',
      price: 1100,
      quantity: 2
    }
  ]
  // only one limit order should be left after all this, and it should be modified.
  const [s2, x2] = await sx(edits, s)
  expect(s2.limitOrders).toHaveLength(1)
  expect(s2.stopOrders).toHaveLength(0)
  expect(x2).toHaveLength(4) // even though only 3 instructions were given, the group cancel cancelled 2 orders to bring the total number of orders changed to 4
  expect(s2.limitOrders[0].price).toBe(1100)
  expect(s2.limitOrders[0].quantity).toBe(2)
})

// After I get up to here, I have enough to move on to strategy implementation.
// I don't need stop-limit or trailing-stop immediately.
