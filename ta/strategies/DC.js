/**
 * This is the actual strategy I want to write.
 * This is the strategy I've been trading manually and have had the most success with.
 * However, my human weaknesses can make execution difficult at times.
 * I want to encode the best me in this strategy.
 */

const clone = require('clone')
const analysis = require('../analysis')
const time = require('../time')

const defaultConfig = {
  biasTf: '12h'
}

function init(baseTimeframe, customConfig) {
  const { logger, balance } = customConfig
  const config = Object.assign({}, defaultConfig, customConfig)
  delete config.logger
  const indicatorSpecs = {
    /*
    '3m':  [ ['rsi'], ['bbands'] ],
    '5m':  [ ['rsi'], ['bbands'] ],
    '10m': [ ['rsi'], ['bbands'] ],
    '15m': [ ['rsi'], ['bbands'] ],
    */
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
  if (config.verbose) {
    console.log(config)
  }
  function strategy(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : initialState
    let orders = []

    const imdBias = marketState[`imd${config.biasTf}`]
    const bias = analysis.bias.highLow.detect(imdBias, divergenceOptions)
    if (state.marketBias != bias) {
      state.marketBias = bias
      if (config.verbose) {
        const ts = time.iso(imdBias.timestamp[0])
        console.log(`${ts} - ${bias}`)
      }
    }

    return [state, orders]
  }
  return [indicatorSpecs, strategy]
}

module.exports = {
  defaultConfig,
  init
}
