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
 * Acknowledge that an order was created on the exchange side
 * @param {Object} o - an order
 * @param {Number} timestamp - DateTime of order execution in milliseconds
 * @returns {Object} a clone of the order with a created status
 */
function ackOrder(o, timestamp) {
  const ack = clone(o)
  ack.status = 'created'
  ack.timestamp = timestamp
  return ack
}

/**
 * Create a rejected order
 * @param {String} reason - why the order was rejected
 * @param {Number} timestamp - DateTime of order execution in milliseconds
 * @returns {Object} a clone of the order with a rejected status
 */
function rejectOrder(o, timestamp, reason) {
  const rejection = clone(o)
  rejection.status = 'rejected'
  rejection.reason = reason || 'unknown'
  rejection.timestamp = timestamp
  return rejection
}

/**
 * Create a filled order
 * @param {Object} o - an order
 * @param {Number} timestamp - DateTime of order execution in milliseconds
 * @returns {Object} a clone of the order with a filled status
 */
function fillOrder(o, timestamp) {
  const filledOrder = clone(o)
  filledOrder.status = 'filled'
  filledOrder.timestamp = timestamp
  return filledOrder
}

/**
 * Calculate the new averageEntryPrice
 * @param {Object} state - previous exchange state
 * @param {Number} price - price of asset
 * @param {Number} quantity - amount of asset bought at the given price
 * @returns {Number} the new averageEntryPrice
 */
function calculateAverageEntryPrice(previousAverage, previousPosition, price, quantity) {
  //console.log (`${Math.abs(previousPosition)} * ${previousAverage} + ${quantity} * ${price} / ${Math.abs(previousPosition)} + ${quantity}`)
  return ((Math.abs(previousPosition) * previousAverage) + (quantity * price)) / (Math.abs(previousPosition) + quantity)
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
      if (newState.position >= 0) {
        // long
        let price = open // should do something fancier here
        if (o.quantity * price < state.balance) {
          let previousPosition = newState.position
          let previousAverage = newState.averageEntryPrice
          newState.balance -= o.quantity * price
          newState.position += o.quantity
          newState.averageEntryPrice = calculateAverageEntryPrice(previousAverage, previousPosition, price, o.quantity)
          let marketBuy = fillOrder(o, candle[0])
          marketBuy.fillPrice = price
          executedOrders.push(marketBuy)
        } else {
          // rejected due to insufficient balance
          let rejection = rejectOrder(o, candle[0], 'insufficient funds')
          executedOrders.push(rejection)
        }
      } else {
        // reducing or closing short
        let price = open
        let position = Math.abs(newState.position)
        if (o.quantity <= position) {
          let difference = (position * newState.averageEntryPrice) - (position * price)
          newState.balance += position * newState.averageEntryPrice + difference
          newState.position += o.quantity
          let marketBuy = fillOrder(o, candle[0])
          marketBuy.fillPrice = price
          executedOrders.push(marketBuy)
        } else {
          // closing short and opening a long simultaneously
          // TODO check for sufficient funds
        }
        if (newState.position === 0) newState.averageEntryPrice = 0
      }
    } else {
      // SELL
      // Is it possible that selling works the same whether we're closing a long or opening a short?
      // I'm starting to think no.
      let price = open
      if (newState.position > 0) {
        // closing a long position
        let previousPosition = newState.position
        let previousAverage = newState.averageEntryPrice
        newState.balance += o.quantity * price
        newState.position -= o.quantity
        newState.averageEntryPrice = calculateAverageEntryPrice(previousAverage, previousPosition, price, o.quantity)
        let marketSell = fillOrder(o, candle[0])
        marketSell.fillPrice = price
        executedOrders.push(marketSell)
      } else {
        if (o.quantity * price < state.balance) {
          let previousPosition = newState.position
          let previousAverage = newState.averageEntryPrice
          newState.balance -= o.quantity * price
          newState.position -= o.quantity
          newState.averageEntryPrice = calculateAverageEntryPrice(previousAverage, previousPosition, price, o.quantity)
          let marketSell = fillOrder(o, candle[0])
          marketSell.fillPrice = price
          executedOrders.push(marketSell)
        } else {
          let rejection = rejectOrder(o, candle[0], 'insufficient funds')
          executedOrders.push(rejection)
        }
      }
      if (newState.position === 0) newState.averageEntryPrice = 0
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
function executeStopAndLimitOrders(state, a, b, candle) {
  let newState = clone(state)
  let executedOrders = []
  let mergedOrders
  if (a < b) {
    // low value to high value (positive slope)
    //console.log(`a:${a} < b:${b}`)
    // find all stop orders between a and b
    //const stopOrders = state.stopOrders.filter((o) => a <= o.price && o.price <= b)
    const [stopOrders, remainingStopOrders] = partition(state.stopOrders, (o) => a <= o.price && o.price <= b)
    newState.stopOrders = remainingStopOrders
    // find all limit orders between a and b
    //const limitOrders = state.limitOrders.filter((o) => a <= o.price && o.price <= b)
    const [limitOrders, remainingLimitOrders] = partition(state.limitOrders, (o) => a <= o.price && o.price <= b)
    newState.limitOrders = remainingLimitOrders
    mergedOrders = sortBy(stopOrders.concat(limitOrders), ['price'])
    //console.log('merged a < b', mergedOrders)
  } else {
    // high value to low value (negative slope)
    //console.log(`a:${a} >= b:${b}`)
    // find all stop orders between a and b
    const [stopOrders, remainingStopOrders] = partition(state.stopOrders, (o) => b <= o.price && o.price <= a)
    newState.stopOrders = remainingStopOrders
    // find all limit orders between a and b
    const [limitOrders, remainingLimitOrders] = partition(state.limitOrders, (o) => b <= o.price && o.price <= a)
    newState.limitOrders = remainingLimitOrders
    mergedOrders = sortBy(stopOrders.concat(limitOrders), ['price'])
    mergedOrders.reverse() // XXX mutation
    //console.log('merged a >= b', mergedOrders)
  }
  //console.log({a, b, mergedOrders})
  mergedOrders.forEach((o) => {
    //console.log(o)
    switch (o.type) {
    case 'limit':
      //console.log('limit', o)
      switch (o.action) {
      case 'buy':
        // check if the order has the reduceOnly option
        if (o.options && o.options.reduceOnly) {
          if (newState.position < o.quantity) {
            let rejection = rejectOrder(o, candle[0], 'reduceOnly orders may only close a position')
            executedOrders.push(rejection)
            break;
          }
        }
        // check if there are sufficient funds
        if (newState.position < 0) {
          // reduce short position
          if ((newState.position < 0) && Math.abs(newState.position) < o.quantity) {
            let rejection = rejectOrder(o, candle[0], 'insufficient position for buy order')
            executedOrders.push(rejection)
            break;
          }
        } else {
          // long
          if (newState.balance <= (o.price * o.quantity)) {
            let rejection = rejectOrder(o, candle[0], 'insufficient funds')
            executedOrders.push(rejection)
            break;
          }
        }
        // are we closing a short position or opening (or extending) a long position?
        if (state.position >= 0) {
          // opening or extending a long position
          let previousPosition = newState.position
          let previousAverage = newState.averageEntryPrice
          newState.position += o.quantity
          newState.balance -= o.price * o.quantity
          newState.averageEntryPrice = calculateAverageEntryPrice(previousAverage, previousPosition, o.price, o.quantity)
          const limitBuy = fillOrder(o, candle[0])
          executedOrders.push(limitBuy)
        } else {
          // closing or reducing a short position
          let price = o.price
          let position = Math.abs(state.position)
          if (o.quantity <= position) {
            let difference = (position * state.averageEntryPrice) - (position * price)
            //console.log({price, entry: state.averageEntryPrice, position, difference })
            newState.balance += Math.abs(state.position) * state.averageEntryPrice + difference
            newState.position += o.quantity
            let marketBuy = fillOrder(o, candle[0])
            executedOrders.push(marketBuy)
          } else {
            // closing short and opening a long simultaneously
            // TODO check for sufficient funds
            // I can skip this for now.
            // I don't intend to make a strategy do this just yet, and it can be approximated with 2 adjacent limit orders.
          }
          if (newState.position === 0) newState.averageEntryPrice = 0
        }
        break;
      case 'sell':
        // check if the order has the reduceOnly option
        if (o.options && o.options.reduceOnly) {
          if (newState.position < o.quantity) {
            let rejection = rejectOrder(o, candle[0], 'reduceOnly orders may only close a position')
            executedOrders.push(rejection)
            break;
          }
        }
        if (newState.position > 0) {
          // reduce or close long position
          if (newState.position < o.quantity) {
            let rejection = rejectOrder(o, candle[0], 'insufficient position for sell order')
            executedOrders.push(rejection)
            break;
          }
          // go ahead and reduce long position
          newState.position -= o.quantity
          newState.balance += o.price * o.quantity
          const limitSell = fillOrder(o, candle[0])
          executedOrders.push(limitSell)
          if (newState.position === 0) newState.averageEntryPrice = 0
          break;
        } else {
          // short
          if (newState.balance <= (o.price * o.quantity)) {
            let rejection = rejectOrder(o, candle[0], 'insufficient funds')
            executedOrders.push(rejection)
            break;
          }
          // opening or extending a short
          let price = o.price
          let previousPosition = newState.position
          newState.balance -= o.quantity * price
          newState.position -= o.quantity
          newState.averageEntryPrice = calculateAverageEntryPrice(newState.averageEntryPrice, previousPosition, price, o.quantity)
          //console.log('opening a new short position', newState.balance, newState.position)
          let limitSell = fillOrder(o, candle[0])
          executedOrders.push(limitSell)
        }
      }
      break;
    case 'stop-limit':
      // TODO later - I can write strategies without this, because I don't use stop-limit orders.
      break;
    case 'stop-market':
      o.oldType = 'stop-market'
      o.type = 'market'
      const fakeCandle = [0, o.price, o.price, o.price, o.price, 0]
      newState.marketOrders.push(o)
      const [s, x] = executeMarketOrders(newState, fakeCandle)
      newState = s
      executedOrders = executedOrders.concat(x)
      break;
    }
  })
  return [newState, executedOrders]
}

/**
 * Convert late limit orders to market orders
 * @param {Object} state - exchange state
 * @param {Array<Number>} candle - the current candle
 * @returns {Object} updated exchange state with late limit orders converted to market orders
 */
function convertLateLimitOrdersToMarketOrders(state, candle) {
  let open = candle[1]
  let newState = clone(state)
  // find limit buys that are higher than the open price
  // find limit sells that are lower than the open price also
  let [mustExecute, rest] = partition(state.limitOrders, (o) => {
    if (o.action === 'buy' && o.price > open) {
      return true
    } else if (o.action === 'sell' && o.price < open) {
      return true
    } else {
      return false
    }
  })
  newState.limitOrders = rest
  let additionalMarketOrders = mustExecute.map((o) => {
    o.oldType = 'limit'
    o.type = 'market'
    return o
  })
  newState.marketOrders = state.marketOrders.concat(additionalMarketOrders)
  return newState
}

/**
 * If there are any modification instructions in orders, execute them.
 * @param {Object} state - Parameter description.
 * @param {Array<Object>} orders - a list of orders that may contain modify instructions
 * @returns {Array} an array of state and executedModifyInstructions
 */
function executeModifyInstructions(state, orders) {
  let newState = clone(state)
  let executedModifyInstructions = []
  const modifyInstructions = orders.filter((o) => o.type === 'modify')
  modifyInstructions.forEach((m) => {
    //console.log(m)
    switch (m.action) {
    case 'cancel':
      if (m.id) {
        let [keepLimits, cancelLimits] = partition(newState.limitOrders, (o) => o.id !== m.id)
        let [keepStops, cancelStops] = partition(newState.stopOrders, (o) => o.id !== m.id)
        newState.limitOrders = keepLimits
        newState.stopOrders = keepStops
        cancelLimits.forEach((o) => o.status = 'cancelled')
        cancelStops.forEach((o) => o.status = 'cancelled')
        executedModifyInstructions = executedModifyInstructions.concat(cancelLimits, cancelStops)
      } else if (m.group) {
        let [keepLimits, cancelLimits] = partition(newState.limitOrders, (o) => o.group !== m.group)
        let [keepStops, cancelStops] = partition(newState.stopOrders, (o) => o.group !== m.group)
        newState.limitOrders = keepLimits
        newState.stopOrders = keepStops
        cancelLimits.forEach((o) => o.status = 'cancelled')
        cancelStops.forEach((o) => o.status = 'cancelled')
        executedModifyInstructions = executedModifyInstructions.concat(cancelLimits, cancelStops)
      }
      break;
    case 'update':
      // NOTE: update is id only.  There are no group updates.
      // TODO: Sanity check the update values to make sure there are enough funds.
      newState.limitOrders.forEach((o) => {
        if (o.id === m.id) {
          const updatedOrder = clone(o)
          updatedOrder.status = 'updated'
          if (m.price) {
            updatedOrder.oldPrice = o.price
            o.price = m.price
          }
          if (m.quantity) {
            updatedOrder.oldQuantity = o.quantity
            o.quantity = m.quantity
          }
          if (m.limitPrice) {
            updatedOrder.oldLimitPrice = o.limitPrice
            o.limitPrice = m.limitPrice
          }
          executedModifyInstructions = executedModifyInstructions.concat(updatedOrder)
        }
      })
      newState.stopOrders.forEach((o) => {
        if (o.id === m.id) {
          const updatedOrder = clone(o)
          updatedOrder.status = 'updated'
          if (m.price) {
            updatedOrder.oldPrice = o.price
            o.price = m.price
          }
          if (m.quantity) {
            updatedOrder.oldQuantity = o.quantity
            o.quantity = m.quantity
          }
          if (m.limitPrice) {
            updatedOrder.oldLimitPrice = o.limitPrice
            o.limitPrice = m.limitPrice
          }
          executedModifyInstructions = executedModifyInstructions.concat(updatedOrder)
        }
      })
      break;
    }
  })
  return [newState, executedModifyInstructions]
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

  // Convert limit orders that have been overtaken by price action to market orders like BitMEX
  let states = []
  let tmpExecutions
  let tmpState = convertLateLimitOrdersToMarketOrders(state, candle)
  states.unshift(tmpState);

  // market orders executed immediately
  [tmpState, tmpExecutions] = executeMarketOrders(states[0], candle)
  executedOrders = executedOrders.concat(tmpExecutions)
  states.unshift(tmpState)

  //console.log({ openToLow, openToHigh, open, high, low })
  if (openToLow > openToHigh) {
    // 1: o->h->l->c
    // o->h
    //console.log(`1: o->h->l->c`, candle);
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], open, high, candle)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('o->h', executedOrders); // these semicolons seem necessary.  It's the destructured assignment without (var, let, or const) that's forcing the semicolon.
    // h->l
    //console.log('h->l');
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], high, low, candle)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('h->l', executedOrders);
    // l->c
    //console.log('l->c');
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], low, close, candle)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('l->c', executedOrders);
  } else {
    // 2: o->l->h->c
    // o->l
    //console.log(`2: o->l->h->c`, candle);
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], open, low, candle)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('o->l', executedOrders); // these semicolons seem necessary
    // l->h
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], low, high, candle)
    states.unshift(tmpState)
    executedOrders = executedOrders.concat(tmpExecutions);
    //console.log('l->h', executedOrders);
    // h->c
    [tmpState, tmpExecutions] = executeStopAndLimitOrders(states[0], high, close, candle)
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
    averageEntryPrice: 0,
  }
}

/**
 * Create the simulated exchange function
 * @param {Object} opts - customization specific to the simulated exchange
 * @returns {Function} a function that updates the state of the exchange.
 */
function create(opts) {
  const logger = opts.logger

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
  return async function simulator(orders, state, candle) {
    // let's get a state we can work with
    let newState = state ? clone(state) : initialState(opts.balance)
    let timestamp = candle ? candle[0] : undefined // XXX - do this better

    // Run any modifications first
    let modifiedState
    let modifications = []
    if (orders && orders.length) {
      [modifiedState, modifications] = executeModifyInstructions(newState, orders)
      //console.log(modifiedState, modifications.length)
      if (modifications.length) {
        newState = modifiedState
      }
    }

    // If orders were given, put them in state as appropriate
    if (orders && orders.length) {
      let limitOrders = orders.filter((o) => o.type === 'limit')
      if (limitOrders.length) {
        newState.limitOrders = newState.limitOrders.concat(limitOrders)
        let limitAcks = limitOrders.map((o) => ackOrder(o, timestamp))
        modifications.push(...limitAcks)
      }
      let marketOrders = orders.filter((o) => o.type === 'market')
      if (marketOrders.length) {
        newState.marketOrders = newState.marketOrders.concat(marketOrders)
        let marketAcks = marketOrders.map((o) => ackOrder(o, timestamp))
        modifications.push(...marketAcks)
      }
      let stopOrders = orders.filter((o) => o.type.match(/^stop-/))
      if (stopOrders.length) {
        newState.stopOrders = newState.stopOrders.concat(stopOrders)
        let stopAcks = stopOrders.map((o) => ackOrder(o, timestamp))
        modifications.push(...stopAcks)
      }
    }

    if (candle) {
      let [newNewState, executedOrders] = executeOrders(newState, candle)
      lastCandle = candle
      return [newNewState, modifications.concat(executedOrders)]
    } else {
      return [newState, modifications]
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
