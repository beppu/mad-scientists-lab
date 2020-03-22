/**
 * This is the actual strategy I want to write.
 * This is the strategy I've been trading manually and have had the most success with.
 * However, my human weaknesses can make execution difficult at times.
 * I want to encode the best me in this strategy.
 */
module.exports = function init(baseTimeframe, config) {
  const indicatorSpecs = {
    '3m':  [ ['rsi'], ['bbands'] ],
    '5m':  [ ['rsi'], ['bbands'] ],
    '10m': [ ['rsi'], ['bbands'] ],
    '15m': [ ['rsi'], ['bbands'] ],
  }
  indicatorSpecs[baseTimeframe] = []
  function strategy(marketState, executedOrders) {
    return []
  }
  return [indicatorSpecs, strategy]
}
