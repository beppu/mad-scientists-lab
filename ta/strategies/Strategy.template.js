/**
 * This strategy does something.
 */

const clone    = require('clone')
const analysis = require('../analysis')

// default strategy configuration
const defaultConfig = {
}

function init(baseTimeframe, customConfig) {
  // merge defaultConfig and customConfig to arrive at the final strategy config
  const config = Object.assign({}, defaultConfig, customConfig)
  // a pino logger for debugging
  const logger = config.logger
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
    // handle executedOrders
    if (executedOrders && executedOrders.length) {
      // if any previously issued orders were executed or rejected, update the strategy's state.
      executedOrders.forEach((o) => {
      })
    }
    return [state, orders]
  }
  return [indicatorSpecs, strategy]
}

// An export function MUST be exported.
// Other things may also be exported to facilitate testing.
module.exports = {
  defaultConfig,
  init
}
