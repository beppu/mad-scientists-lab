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
      stopPrice: 7800 // stopPrice == price for stop-market orders
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
  const balance = 100000
  const sx = simulator.create({ balance })
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
  let r = sx(undefined, orders, candles[0])
  expect(r[1]).toHaveLength(1)
  let r2 = sx(r[0], limitOrders, candles[1])
  //console.log(r2)
  const newBalance = r2[0].balance
  expect(r2[0].limitOrders).toHaveLength(0)
  expect(r2[1]).toHaveLength(2)
  expect(newBalance).toBeGreaterThan(balance)
})

test("short positions should be possible with market orders", () => {
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
  let r = sx(undefined, shortOrders, candles[0])
  //console.log(r[0])
  expect(r[0].position).toBeLessThan(0)
  let r2 = sx(r[0], closeOrders, candles[1])
  //console.log(r2)
  expect(r2[0].balance).toBeLessThan(balance) // this trade should lose money
  expect(r2[1]).toHaveLength(1)
})

test("short positions should be possible with limit orders", () => {
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
  let r = sx(undefined, shortOrders, candles[0])
  expect(r[1]).toHaveLength(1)             // the short should be executed on this candle
  expect(r[0].limitOrders).toHaveLength(0)
  //console.log(r[0])
  let r2 = sx(r[0], closeOrders, candles[1])
  expect(r2[1]).toHaveLength(1) // the previous short order and the take profit order should fill in the same candle
  expect(r2[0].balance).toBeGreaterThan(balance) // this should be a profitable short trade
  expect(r2[0].position).toBe(0) // we should have no position after all trades have executed
  //console.log(r2[0].balance, r2[0].position)
})

test("limit buys orders priced higher than the current price should be turned into market buys", () => {
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
  let r = sx(undefined, buyOrders, candles[0])
  expect(r[1]).toHaveLength(1)
  expect(r[1][0].type).toBe('market')
  expect(r[1][0].oldType).toBe('limit')
})

test("limit sell orders that are lower than the current price should be turned into market sells", () => {
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
  let r = sx(undefined, sellOrders, candles[0])
  //console.log(r)
  expect(r[1]).toHaveLength(1)
  expect(r[1][0].type).toBe('market')
  expect(r[1][0].oldType).toBe('limit')
  expect(r[1][0].fillPrice).toBeGreaterThan(0)
})

test("all sells that increase a position should adjust the averageEntryPrice", () => {
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
  const r = sx(undefined, sellOrders, candles[0])
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

test("all buys that increase a position should adjust the averageEntryPrice", () => {
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
  const r = sx(undefined, sellOrders, candles[0])
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

test("stop market orders should be able to close positions", () => {
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
      stopPrice: 2000
    }
  ]
  const [state, executedOrders] = sx(undefined, orders, candles[0])
  expect(state.balance).toBe(balance - (orders[0].price - orders[1].stopPrice))
  expect(state.averageEntryPrice).toBe(0)
})

test("stop market orders should be able to open positions", () => {
  const balance = 100000
  const sx = simulator.create({ balance })
})

test("unexecuted orders should be editable", () => {
  const balance = 100000
  const sx = simulator.create({ balance })
})

// After I get up to here, I have enough to move on to strategy implementation.
// I don't need stop-limit or trailing-stop.
