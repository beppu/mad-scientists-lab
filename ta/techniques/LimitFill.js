/*

  The purpose of this code is to implement a reusable state machine for
  filling a position using limit orders.  In order to ensure a fill, a
  threshold may be given after which a market order is used as a last resort.
  The fees incurred by using market orders can add up, so it'll be nice to let
  strategies express an intent to buy and then let this code fullfill that intent.

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

function init(options) {
  return function limitFillMicroStrategy(strategyState, marketstate, executedOrders) {
  }
}

module.exports = {
  init
}
