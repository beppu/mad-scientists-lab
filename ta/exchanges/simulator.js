const clone = require('clone')
const sortBy = require('lodash.sortby')
const partition = require('lodash.partition')

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

/**
 * Create a rejected order
 * @param {String} reason - why the order was rejected
 */
function rejectOrder(o, reason) {
  const rejection = clone(o)
  o.status = 'rejected'
  o.reason = reason || 'unknown'
  return o
}

/**
 * Create a filled order
 * @param {Object} o - an order
 * @returns {Object} a clone of the order with a filled status
 */
function fillOrder(o) {
  const filledOrder = clone(o)
  filledOrder.status = 'filled'
  return filledOrder
}

// How to calculate profits/losses for shorts:
// https://www.investopedia.com/ask/answers/05/maxreturnshortsale.asp

/**
 * Execute any existing market orders and return the new state of the exchange
 * @param {Object} state - exchange state
 * @param {Array<Number>} candle - the current candle
 * @returns {Object} exchange state after market orders have been executed
 */
function executeMarketOrders(state, candle) {
  const [timestamp, open, high, low, close, volume] = candle
  let executedOrders = []
  let newState = clone(state)
  state.marketOrders.forEach((o) => {
    if (o.action === 'buy') {
      // BUY
      // but are we opening a long or closing a short?
      if (state.position >= 0) {
        // long
        let price = open // should do something fancier here
        if (o.quantity * price < state.balance) {
          newState.balance -= o.quantity * price
          newState.position += o.quantity
          let marketBuy = fillOrder(o)
          executedOrders.push(marketBuy)
        } else {
          // rejected due to insufficient balance
          let rejection = rejectOrder(o, 'insufficient funds')
          executedOrders.push(rejection)
        }
      } else {
        // closing short
        let price = open
        let position = Math.abs(state.position)
        if (o.quantity <= position) {
          let difference = (position * state.averageEntryPrice) - (position * price)
          //console.log({price, entry: state.averageEntryPrice, position, difference })
          newState.balance += Math.abs(state.position) * state.averageEntryPrice + difference
          newState.position += o.quantity
          let marketBuy = fillOrder(o)
          executedOrders.push(marketBuy)
        } else {
          // closing short and opening a long simultaneously
          // TODO check for sufficient funds
        }
      }
    } else {
      // SELL
      // Is it possible that selling works the same whether we're closing a long or opening a short?
      let price = open
      if (o.quantity * price < state.balance) {
        newState.balance -= o.quantity * price
        newState.position -= o.quantity
        newState.averageEntryPrice = price // FIXME - calculate a running average
        let marketSell = fillOrder(o)
        executedOrders.push(marketSell)
      } else {
        let rejection = rejectOrder(o, 'insufficient funds')
        executedOrders.push(rejection)
      }
    }
  })
  newState.marketOrders = []
  return [newState, executedOrders]
}

/**
 * Execute limit and stop orders as price goes from a to b
 * @param {Object} state - exchange state
 * @param {Number} a - price to begin at
 * @param {Number} b - price to end at
 * @returns {Return Type} exchange state after orders between price a and b have been executed
 */
function executeStopAndLimitOrders(state, a, b) {
  const newState = clone(state)
  let executedOrders = []
  let mergedOrders
  if (a < b) {
    // low value to high value (positive slope)
    //console.log(`a:${a} < b:${b}`)
    // find all stop orders between a and b
    //const stopOrders = state.stopOrders.filter((o) => a <= o.stopPrice && o.stopPrice <= b)
    const [stopOrders, remainingStopOrders] = partition(state.stopOrders, (o) => a <= o.stopPrice && o.stopPrice <= b)
    newState.stopOrders = remainingStopOrders
    // find all limit orders between a and b
    //const limitOrders = state.limitOrders.filter((o) => a <= o.price && o.price <= b)
    const [limitOrders, remainingLimitOrders] = partition(state.limitOrders, (o) => a <= o.price && o.price <= b)
    newState.limitOrders = remainingLimitOrders
    mergedOrders = sortBy(stopOrders.concat(limitOrders), (o) => {
      if (o.type.match(/^stop/)) {
        return o.stopPrice
      } else {
        return o.price
      }
    })
    //console.log('merged a < b', mergedOrders)
  } else {
    // high value to low value (negative slope)
    //console.log(`a:${a} >= b:${b}`)
    // find all stop orders between a and b
    const [stopOrders, remainingStopOrders] = partition(state.stopOrders, (o) => b <= o.stopPrice && o.stopPrice <= a)
    newState.stopOrders = remainingStopOrders
    // find all limit orders between a and b
    const [limitOrders, remainingLimitOrders] = partition(state.limitOrders, (o) => b <= o.price && o.price <= a)
    newState.limitOrders = remainingLimitOrders
    mergedOrders = sortBy(stopOrders.concat(limitOrders), (o) => {
      if (o.type.match(/^stop/)) {
        return o.stopPrice
      } else {
        return o.price
      }
    })
    //console.log('merged a >= b', mergedOrders)
  }
  mergedOrders.forEach((o) => {
    switch (o.type) {
    case 'limit':
      //console.log('limit', o)
      switch (o.action) {
      case 'buy':
        // check if the order has the reduceOnly option
        if (o.options && o.options.reduceOnly) {
          if (newState.position < o.quantity) {
            let rejection = rejectOrder(o, 'reduceOnly orders may only close a position')
            executedOrders.push(rejection)
            break;
          }
        }
        // check if there are sufficient funds
        if (newState.position < 0) {
          // reduce short position
          if ((newState.position < 0) && Math.abs(newState.position) < o.quantity) {
            let rejection = rejectOrder(o, 'insufficient position for buy order')
            executedOrders.push(rejection)
            break;
          }
        } else {
          // long
          if (newState.balance <= (o.price * o.quantity)) {
            let rejection = rejectOrder(o, 'insufficient funds')
            executedOrders.push(rejection)
            break;
          }
        }
        // are we closing a short position or opening a long position?
        if (state.position >= 0) {
          console.log('before', { p: newState.position, q: o.quantity, b: newState.balance })
          newState.position += o.quantity
          newState.balance -= o.price * o.quantity
          console.log('after ', { p: newState.position, q: o.quantity, b: newState.balance })
          const limitBuy = fillOrder(o)
          executedOrders.push(limitBuy)
        } else {
          let price = o.price
          let position = Math.abs(state.position)
          if (o.quantity <= position) {
            let difference = (position * state.averageEntryPrice) - (position * price)
            //console.log({price, entry: state.averageEntryPrice, position, difference })
            newState.balance += Math.abs(state.position) * state.averageEntryPrice + difference
            newState.position += o.quantity
            let marketBuy = fillOrder(o)
            executedOrders.push(marketBuy)
          } else {
            // closing short and opening a long simultaneously
            // TODO check for sufficient funds
          }
        }
        break;
      case 'sell':
        // check if the order has the reduceOnly option
        if (o.options && o.options.reduceOnly) {
          if (newState.position < o.quantity) {
            let rejection = rejectOrder(o, 'reduceOnly orders may only close a position')
            executedOrders.push(rejection)
            break;
          }
        }
        // check if there are sufficient funds
        if (newState.position > 0) {
          // reduce long position
          if (newState.position < o.quantity) {
            let rejection = rejectOrder(o, 'insufficient position for sell order')
            executedOrders.push(rejection)
            break;
          }
          // go ahead and reduce long position
          newState.position -= o.quantity
          newState.balance += o.price * o.quantity
          const limitSell = fillOrder(o)
          executedOrders.push(limitSell)
          break;
        } else {
          // short
          if (newState.balance <= (o.price * o.quantity)) {
            let rejection = rejectOrder(o, 'insufficient funds')
            executedOrders.push(rejection)
            break;
          }
          // go ahead and open a new short position
          let price = o.price
          newState.balance -= o.quantity * price
          newState.position -= o.quantity
          newState.averageEntryPrice = price // FIXME - calculate a running average
          //console.log('opening a new short position', newState.balance, newState.position)
          let limitSell = fillOrder(o)
          executedOrders.push(limitSell)
        }
      }
      break;
    case 'stop-limit':
      break;
    case 'stop-market':
      break;
    }
  })
  return [newState, executedOrders]
}

/*

  For simulated order execution, follow these rules:

  1. If the bar’s high is closer to bar’s open than the bar’s low, the broker emulator assumes that intrabar price was moving this way: open → high → low → close.
  2. If the bar’s low is closer to bar’s open than the bar’s high, the broker emulator assumes that intrabar price was moving this way: open → low → high → close.
  3. The broker emulator assumes that there are no gaps inside bars, meaning the full range of intrabar prices is available for order execution.

  credit: https://www.tradingview.com/pine-script-docs/en/v4/essential/Strategies.html

 */

/**
 * Execute orders
 * @param {Object} state - exchange state
 * @param {Array<Number>} candle - the current candle
 * @returns {Object} exchange state after orders have been executed for the current candle
 */
function executeOrders(state, candle) {
  let executedOrders = []
  // 0:t 1:o 2:h 3:l 4:c 5:v
  const [timestamp, open, high, low, close, volume] = candle
  //console.log({timestamp})

  const openToHigh = high - open
  const openToLow  = open - low

  // TODO - Convert limit orders that have been overtaken by price action to market orders like BitMEX

  // market orders executed immediately
  let states = []
  let [tmpState, tmpExecutions] = executeMarketOrders(state, candle)
  executedOrders = executedOrders.concat(tmpExecutions)
  states.unshift(tmpState)

  //console.log({ openToLow, openToHigh, open, high, low })
  if (openToLow > openToHigh) {
    // 1: o->h->l->c
    // o->h
    //console.log(1);
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], open, high)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('o->h', executedOrders); // these semicolons seem necessary.  It's the destructured assignment without (var, let, or const) that's forcing the semicolon.
    // h->l
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], high, low)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('h->l', executedOrders);
    // l->c
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], low, close)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('l->c', executedOrders);
  } else {
    // 2: o->l->h->c
    // o->l
    //console.log(2, 'openToLow <= openToHigh');
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], open, low)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('o->l', executedOrders); // these semicolons seem necessary
    // l->h
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], low, high)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('l->h', executedOrders);
    // h->c
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], high, close)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('h->c', executedOrders);
  }
  const newState = states[0]
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
  rejectOrder,
  executeMarketOrders,
  executeStopAndLimitOrders,
  executeOrders
}
