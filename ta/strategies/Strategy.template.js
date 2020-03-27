/**
 * This strategy does something.
 */

const clone = require('clone')

module.exports = function init(baseTimeframe, config) {
  const indicatorSpecs = {
  }
  indicatorSpecs[baseTimeframe] = []
  function strategy(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : {}
    return [state, []]
  }
  return [indicatorSpecs, strategy]
}
