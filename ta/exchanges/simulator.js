const clone = require('clone')

/*

  A simulated exchange takes price action and orders as inputs.
  However, a real exchange's price action comes from market buys and sells.
  This has implications for API design.
  A simulator needs to be fed candles, but a real exchange does not.
  Maybe it's OK for the simulator function to have a different function signature than a real exchange.
  What do all exchanges (simulated or otherwise) have in common?
  - They have to take orders.
  - They have to execute orders.

  Their output is order execution state.
  This could include an order book.

  Something else I have to figure out is what an order looks like.
  It should probably be an object that looks something like:

  {
    type: 'buy-limit',
    price: 7700,
    quantity: 100000,
    reduceOnly: false
  }

  Order types would initially be:
  buy-limit
  sell-limit
  buy-market
  sell-market
  buy-market-stop
  sell-market-stop

 */

function executeMarketOrders(state, candle) {
  const [timestamp, open, high, low, close, volume] = candle
  let executedOrders = []
  let newState = clone(state)
  state.marketOrders.forEach((o) => {
    if (o.action === 'buy') {
      let price = open // should do something fancier here
      if (o.quantity * price < state.balance) {
        newState.balance -= o.quantity * price
        newState.position += o.quantity
        let marketBuy = clone(o)
        marketBuy.status = 'filled'
        executedOrders.push(marketBuy)
      } else {
        // rejected due to insufficient balance
        let rejection = clone(o)
        rejection.status = 'rejected'
        rejection.reason = 'insufficient funds'
        executedOrders.push(rejection)
      }
    } else {
      let price = open
      if (o.quantity * price < state.balance) {
        newState.balance -= o.quantity * price
        newState.position -= o.quantity
        let marketSell = clone(o)
        marketSell.status = 'filled'
        executedOrders.push(marketSell)
      } else {
        let rejection = clone(o)
        rejection.status = 'rejected'
        rejection.reason = 'insufficient funds'
        executedOrders.push(rejection)
      }
    }
  })
  newState.marketOrders = []
  return [newState, executedOrders]
}

/*

  For simulated order execution, follow these rules:

  1. If the bar’s high is closer to bar’s open than the bar’s low, the broker emulator assumes that intrabar price was moving this way: open → high → low → close.
  2. If the bar’s low is closer to bar’s open than the bar’s high, the broker emulator assumes that intrabar price was moving this way: open → low → high → close.
  3. The broker emulator assumes that there are no gaps inside bars, meaning the full range of intrabar prices is available for order execution.

  credit: https://www.tradingview.com/pine-script-docs/en/v4/essential/Strategies.html

 */

function executeOrders(state, candle) {
  let executedOrders = []
  // 0:t 1:o 2:h 3:l 4:c 5:v
  const [timestamp, open, high, low, close, volume] = candle

  const openToHigh = high - open
  const openToLow  = open - low

  // market orders executed immediately
  let [s0, executedMarketOrders] = executeMarketOrders(state, candle)
  executedOrders = executedOrders.concat(executedMarketOrders)

  if (openToLow > openToHigh) {
    // 1: o->h->l->c

    // search the orderbook for orders to execute
    // i just realized that stop orders should not be in the order book but a seperate data structure.
  } else {
    // 2: o->l->h->c

    // limit orders: o->l
    // limit orders: l->h
    // limit orders: h->c
  }
  return [newState, executedOrders]
}

/**
 * Create a pristine simulator exchange state
 * @returns {Object} exchange state
 */
function initialState(balance) {
  return {
    limitOrders: [],
    stopOrders: [],
    marketOrders: [],
    position: 0, // + for long, - for short
    balance: balance || 0,
  }
}

/**
 * Create the simulated exchange function
 * @param {Object} opts - customization specific to the simulated exchange
 * @returns {Function} a function that updates the state of the exchange.
 */
function create(opts) {

  // What is the internal state of the exchange?
  /*
  let state = {
    limitOrders: [],
    stopOrders: [],
    marketOrders: [],
    positions: [] // The strategy should track what positions its holding, but the simulator will do it internally as well.
  }
  */

  let lastCandle

  /**
   * Update the state of the simulated exchange
   * @param {Object} state - simulated exchange state
   * @param {Array<Object>} orders - an array of orders to apply to the order book
   * @param {Object} candle - a candle
   * @returns {Array<Object>} an array containing updated state and a list of actions that happened in this iteration.
   */
  return function simulator(state, orders, candle) {
    // let's get a state we can work with
    let newState = state ? clone(state) : initialState(opts.balance)

    // If orders were given, put them in state as appropriate
    if (orders && orders.length) {
      let limitOrders = orders.filter((o) => o.type === 'limit')
      if (limitOrders.length)
        newState.limitOrders = newState.limitOrders.concat(limitOrders)
      let marketOrders = orders.filter((o) => o.type === 'market')
      if (marketOrders.length)
        newState.marketOrders = newState.marketOrders.concat(marketOrders)
      let stopOrders = orders.filter((o) => o.type.match(/^stop-/))
      if (stopOrders.length)
        newState.stopOrders = newState.stopOrders.concat(stopOrders)
    }

    if (candle) {
      let [newNewState, executedOrders] = executeOrders(newState, candle)
      lastCandle = candle
      return [newNewState, executedOrders]
    } else {
      return [newState, []]
    }
  }
}

module.exports = {
  create,
  executeOrders
}
