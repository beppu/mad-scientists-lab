/**
 * This strategy does something.
 */

const clone = require('clone')

function init(baseTimeframe, config) {
  // keys should be timeframes, values should be an array of desired indicators
  const indicatorSpecs = {}
  // the strategy's initial state
  const initialState = {}
  function strategy(strategyState, marketState, executedOrders) {
    // the strategy's state should be a function of:
    // - its previous state
    // - the new marketState
    // - a list of previously issued orders that were executed recently
    let state = strategyState ? clone(strategyState) : initialState
    // orders is a list of orders the strategy wants to place on the exchange
    let orders = []
    return [state, orders]
  }
  return [indicatorSpecs, strategy]
}

module.exports = {
  init
}
