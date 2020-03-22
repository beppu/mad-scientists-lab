/**
 * This is a strategy that is intended to work on low timeframes.
 * It'll specialize in small movements.
 */
module.exports = function init(baseTimeframe, config) {
  const indicatorSpecs = {
  }
  indicatorSpecs[baseTimeframe] = []
  function strategy(marketState, executedOrders) {
    return []
  }
  return [indicatorSpecs, strategy]
}
