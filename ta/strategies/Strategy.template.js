/**
 * This strategy does something.
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
