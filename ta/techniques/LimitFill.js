/*

  The purpose of this code is to implement a reusable state machine for
  filling a position using limit orders.  In order to ensure a fill, a
  threshold may be given after which a market order is used as a last resort.
  The fees incurred by using market orders can add up, so it'll be nice to let
  strategies express an intent to buy and then let this code fullfill that intent
  with limit orders if possible and market orders if not.

  I have to think this through.
  Imagine the new GuppyLimit strategy.
  It has more states than the original Guppy strategy even without counting the internal states
  of this LimitFill microstrategy.

  // Also look at this function signature.
  function strategy(strategyState, marketState, executedOrders) { }

  What makes a strategy?  Is it the signature?  Is the act of taking
  marketState and executedOrders the heart of what it means to be a strategy?
  Thus, a microstrategy can also be thought of as a nestable strategy.
  It takes the same inputs of marketState and executedOrders.
  What separates it from a larger strategy is its limited scope.

  I noticed one difference though.  A microstrategy doesn't currently return
  indicatorSpecs, because the first one I want to write doesn't need them.
  Will I need them in the future?  Initially, I thought no, but what if I
  implemented ChandelierExit and needed ATR to be calculated?  Then, I would
  need indicatorSpecs. Maybe for consistency with strategy init functions, I
  should continue returning indicatorSpecs even if they're empty.


  // States
  - Neutral
  - Want to Buy/Sell
  - Order Placed
  - Order Partially Filled
    (keep going)
  - Order Filled
    (we're done)
  - Order Update Time Threshold Reached
    (if order unfilled and price moved against us, chase the price by updating the limit order)
  - Order Price Threshold Reached
    (market order to force fill position)

  // Potential API
  // - How do I tell it I want to buy?
  // - GuppyLimit will get a buy signal.
  // - Then, LimitFill has to be told by GuppyLimit to build a long position using limit orders.
  //   HOW, though?
  //   Maybe LimitFill.js could export functions that create a new strategyState for Limitfill that
  //     tells it to start working.

 */

const clone = require('clone')
const uuid = require('uuid')

/**
 * Determine whether an existing limit order needs to be updated.
 * @param {Object} strategyState - the current state of the LimitSell microstrategy
 * @param {Object} marketState - the current market state (prices and indicators)
 * @returns {Boolean} true if it's time to update an unfilled order
 */
function needToUpdate(strategyState, marketState) {
  // Q: How do I know if I've just moved into a timeframe boundary?
  // A: I could keep track of timestamps internally.

  // We're updating the price in order to make a fill more likely.
  // Think of it as a slow chase.
  const currentTimestamp = marketState[imd`${strategyState.tf}`].timestamp[0]

  return (strategyState.node === 'waiting-for-fill' &&  currentTimestamp > strategyState.ts)
}

/**
 * Return true if price has moved too far against us, and we want to use market orders to force us into position.
 * @param {Object} strategyState - the current state of the LimitSell microstrategy
 * @param {Number} lastPrice - the last close price
 * @returns {Boolean} true if we want to fall back to market orders
 */
function beyondPriceThreshold(strategyState, lastPrice) {
  if (strategyState.side === 'buy') {
    return lastPrice >= strategyState.priceThreshold
  } else {
    return lastPrice <= strategyState.priceThreshold
  }
}

/**
 * Initialize the LimitFill microstrategy for filling a position with limit orders.
 * Every time a trading strategy wants to buy or sell with limit orders, a new LimitFill strategy
 * should be initialized.
 * @param {Object} options - strategy configuration
 * @param {String} options.side - 'buy' or 'sell'
 * @param {Number} options.quantity - desired position size
 * @param {Number} options.priceThreshold - price at which we give up on limit orders and use market orders to force fill the position
 * @param {String} options.tf - timeframe interval for updating price of unfilled limit orders
 * @returns {Array<Any>} Return an array containing indicatorSpecs and a microstrategy function
 */
function init(options) {
  const initialState = {
    node:           'start',
    side:           options.side,              // 'buy' or 'sell'
    quantity:       options.quantity,          // quantity desired
    filled:         0,                         // quantity filled
    price:          undefined,                 // price of current limit order
    priceStep:      0.5,                       // smallest amount a price can change
    priceThreshold: options.priceThreshold,    // price to give up on limit orders and use market orders to fill the remainder of the position
    ts:             undefined,                 // timestamp of last seen candle
    tf:             options.tf,                // timeframe boundary to update price of unfilled limit orders (typically '1m') :: also used for imd selection
    group:          options.group              // (optional) group id (to be used later by log analyzers to group related trades together)
                                               // XXX - group is deprecated
  }
  const indicatorSpecs = {}                    // No special indicators needed.

  function limitFillMicroStrategy(strategyState, marketState, executedOrders) {
    // This strategyState is separate from the outside (GuppyLimit) strategyState
    // Here, strategyState is all about whether we've filled the position or not.
    // GuppyLimit (or whatever other strategy) told us to buy or sell, and it's up
    // to this strategy to get the position filled.
    const ns = strategyState ? clone(strategyState) : clone(initialState)
    const orders = []
    const tf = ns.tf
    const imd = marketState[`imd${tf}`]
    const lastPrice = imd.close[0]
    // create a new group id if no group id is given.
    if (!ns.group) {
      ns.group = uuid.v4()
    }

    executedOrders.forEach((eo) => {
      // This block is important, because this is what gets us to the filled state.
      if (eo.type === 'limit' && eo.status === 'filled') {
        ns.filled += eo.quantity
        if (ns.filled === ns.quantity) {
          ns.node = 'filled'
        }
      }
    })

    switch (ns.node) {
    case 'start':
      const orderPrice = ns.side === 'buy' ? lastPrice - ns.priceStep : lastPrice + ns.priceStep
      const limitOrder = {
        type: 'limit',
        action: ns.side,
        quantity: ns.quantity,
        price: orderPrice,
        group: ns.group,        // XXX - group is deprecated and a new way will have to be found
        id: `limit-${ns.side}`  // XXX - id should be a uuid
      }
      ns.price = orderPrice
      ns.node = 'waiting-for-fill'
      orders.push(limitOrder)
      break;
    case 'waiting-for-fill':
      // If we're on a brand new candle, and we're not filled yet, update the order.
      if (needToUpdate(ns, marketState)) {
        const newPrice = ns.side === 'buy' ? lastPrice - ns.priceStep : lastPrice + ns.priceStep
        const updateLimitOrder = {
          action: 'update',
          id: `limit-${ns.side}`, // XXX - id should be a uuid
          price: newPrice
        }
        orders.push(updateLimitOrder)
      }

      // If price has moved beyond our priceThreshold, cancel the limit order and fill the remainder with a market order
      if (beyondPriceThreshold(ns, lastPrice)) {
        const cancelLimitOrder = {
          action: 'cancel',
          id: `limit-${ns.side}` // XXX - id should be a uuid
        }
        const marketOrder = {
          type: 'market',
          action: ns.side,
          quantity: ns.quantity - ns.filled
        }
        orders.push(cancelLimitOrder, marketOrder)
      }

      break;
    case 'filled':
      // Mission Accomplished.  Nothing left to do.
      break;
    }

    ns.ts = imd.timestamp[0]
    return [ns, orders]
  }

  return [indicatorSpecs, limitFillMicroStrategy]
}

module.exports = {
  init
}
