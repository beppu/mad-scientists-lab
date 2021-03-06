/**
 * This is a strategy that is intended to work on low timeframes.
 * It'll specialize in small movements.
 */

const clone = require('clone')

function init(config) {
  const indicatorSpecs = {
  }
  function strategy(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : {}
    return [state, []]
  }
  return [indicatorSpecs, strategy]
}

module.exports = {
  init
}
