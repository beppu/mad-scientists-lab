/**
 * This strategy is only for debugging.
 * I might not even check it in.
 */

const clone = require('clone')
const analysis = require('../analysis')
const time = require('../time')

const divergenceOptions = {
  ageThreshold: 1,
  gapThreshold: [7, 30],
  peakThreshold: 9,
}

//const _ignore = ['timestamp', 'open', 'high', 'low', 'close']
const _ignore = []
/**
 * Print the newly completed previous day's indicators
 * @param {MarketState} marketState - calculated data from the pipeline
 */
function _printIndicators(marketState) {
  const imd1d = marketState.imd1d
  const imd1h = marketState.imd1h
  const currentTs = time.dt(imd1h.timestamp[0])
  if (time.isTimeframeBoundary('1d', currentTs)) {
    const ts = time.iso(imd1d.timestamp[1]) // // get the previous day's timestamp
    const availableIndicators = Object.keys(imd1d).reduce((m, a) => {
      if (_ignore.includes(a)) {
        return m
      } else {
        m[a] = imd1d[a][1] // print the previous day since it's a brand new completed candle
        return m
      }
    }, { })
    //console.log(ts, availableIndicators)
  }
}

function init(baseTimeframe, config) {
  const { logger, balance } = config

  // override divergenceOptions
  if (config.ageThreshold)  divergenceOptions.ageThreshold  = config.ageThreshold
  if (config.gapThreshold)  divergenceOptions.gapThreshold  = config.gapThreshold
  if (config.peakThreshold) divergenceOptions.peakThreshold = config.peakThreshold

  // This strategy is for telling me how long we've been in a divergent state.
  // It exists to hlpe me tune the divergence detection code.
  const indicatorSpecs = {
    '1h':  [ ['rsi'], ['bbands'] ],
    '1d':  [ ['rsi'], ['bbands'] ],
  }

  function strategy(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : { bullish: undefined, bearish: undefined }
    const ts = time.dt(marketState.imd1h.timestamp[0])
    _printIndicators(marketState)
    if (analysis.divergence.regularBullish(marketState.imd1d, divergenceOptions)) {
      if (!state.bullish) {
        state.bullish = ts
      }
    } else {
      if (state.bullish) {
        // leaving the state.bullish state
        const ts = marketState.imd1d.timestamp[1] < state.bullish ? state.bullish : time.dt(marketState.imd1d.timestamp[1])
        console.info(`1d state.bullish divergence from ${state.bullish.toISO()} to ${ts.toISO()}`, analysis.divergence.debug)
        state.bullish = undefined
      }
    }
    /*
    if (analysis.divergence.regularBearish(marketState.imd1d, divergenceOptions)) {
      if (!state.bearish) {
        state.bearish = ts
      }
    } else {
      if (state.bearish) {
        const ts = marketState.imd1d.timestamp[1] < state.bearish ? state.bearish : time.dt(marketState.imd1d.timestamp[1])
        console.info(`1d state.bearish divergence from ${state.bearish.toISO()} to ${ts.toISO()}`, analysis.divergence.debug)
        state.bearish = undefined
      }
    }
    */
    return [state, []]
  }

  return [indicatorSpecs, strategy]
}

module.exports = {
  divergenceOptions,
  init
}
