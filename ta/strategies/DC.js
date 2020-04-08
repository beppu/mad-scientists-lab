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
    '3m':  [ ['rsi'], ['bbands'] ],
    '5m':  [ ['rsi'], ['bbands'] ],
    '10m': [ ['rsi'], ['bbands'] ],
    '15m': [ ['rsi'], ['bbands'] ],
    '1h':  [ ['rsi'], ['bbands'] ],
    '2h':  [ ['rsi'], ['bbands'] ],
    '4h':  [ ['rsi'], ['bbands'] ],
    '6h':  [ ['rsi'], ['bbands'] ],
    '12h': [ ['rsi'], ['bbands'] ],
    '1d':  [ ['rsi'], ['bbands'] ],
  }
  const divergenceOptions = {
    ageThreshold: 1,
    gapThreshold: [7, 30],
    peakThreshold: 9,
  }
  const initialState = {
    marketBias: undefined
  }
  function strategy(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : initialState
    let orders = []

    const imd12h = marketState.imd12h
    const bias = analysis.bias.highLow.detect(imd12h, divergenceOptions)
    if (state.marketBias != bias) {
      state.marketBias = bias
    }

    return [state, orders]
  }
  return [indicatorSpecs, strategy]
}

module.exports = {
  init
}
