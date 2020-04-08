/**
 * This is the actual strategy I want to write.
 * This is the strategy I've been trading manually and have had the most success with.
 * However, my human weaknesses can make execution difficult at times.
 * I want to encode the best me in this strategy.
 */

const clone = require('clone')
const analysis = require('../analysis')
const time = require('../time')

function init(baseTimeframe, config) {
  const { logger, balance } = config
  const indicatorSpecs = {
    /*
    '3m':  [ ['rsi'], ['bbands'] ],
    '5m':  [ ['rsi'], ['bbands'] ],
    '10m': [ ['rsi'], ['bbands'] ],
    '15m': [ ['rsi'], ['bbands'] ],
    */
    '1d':  [ ['rsi'], ['bbands'] ],
  }
  const divergenceOptions = {
    ageThreshold: 1,
    gapThreshold: [7, 30],
    peakThreshold: 9,
  }
  indicatorSpecs[baseTimeframe] = []
  function strategy(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : {}
    if (analysis.divergence.regularBullish(marketState.imd1d, divergenceOptions)) {
      const ts = time.dt(marketState.imd1d.timestamp[0])
      logger.info(`1d bullish divergence on ${ts.toISO()} at ${marketState.imd1d.low[0]}`)
    }
    return [state, []]
  }
  return [indicatorSpecs, strategy]
}

module.exports = {
  init
}
