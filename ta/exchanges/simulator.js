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

function executeOrders(orderBook, candle) {
  let newOrderBook = {}
  let executedOrders = []
  return [newOrderBook, executedOrders]
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
    orderBook: {
      buy: [],
      sell: []
    },
    positions: []
  }
  */

  // What are the actions that happened to change the exchange state in this iteration?
  // This is where filled orders would be noted so that strategies can know how what's happening with their orders.
  let actions = []

  let lastCandle

  /**
   * Update the state of the simulated exchange
   * @param {Object} state - simulated exchange state
   * @param {Array<Object>} orders - an array of orders to apply to the order book
   * @param {Object} candle - a candle
   * @returns {Array<Object>} an array containing updated state and a list of actions that happened in this iteration.
   */
  return function simulator(state, orders, candle) {
    if (candle)
      lastCandle = candle
    return [state, actions]
  }
}


module.exports = {
  create,
  executeOrders
}
