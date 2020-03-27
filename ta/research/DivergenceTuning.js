/**
 * This strategy is only for debugging.
 * I might not even check it in.
 */

const analysis = require('../analysis')
const time = require('../time')

const divergenceOptions = {
  ageThreshold: 1,
  gapThreshold: [7, 30],
  peakThreshold: 9,
}

module.exports = function init(baseTimeframe, config) {
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
  let bullish, bearish
  function strategy(marketState, executedOrders) {
    if (analysis.divergence.regularBullish(marketState.imd1d, divergenceOptions)) {
      const ts = time.dt(marketState.imd1d.timestamp[0])
      if (!bullish) {
        bullish = ts
      }
    } else {
      if (bullish) {
        // leaving the bullish state
        const ts = marketState.imd1d.timestamp[1] < bullish ? bullish : time.dt(marketState.imd1d.timestamp[1])
        console.info(`1d bullish divergence from ${bullish.toISO()} to ${ts.toISO()}`, analysis.divergence.debug)
        bullish = undefined
      }
    }
    if (analysis.divergence.regularBearish(marketState.imd1d, divergenceOptions)) {
      const ts = time.dt(marketState.imd1d.timestamp[0])
      if (!bearish) {
        bearish = ts
      }
    } else {
      if (bearish) {
        const ts = marketState.imd1d.timestamp[1] < bearish ? bearish : time.dt(marketState.imd1d.timestamp[1])
        console.info(`1d bearish divergence from ${bearish.toISO()} to ${ts.toISO()}`, analysis.divergence.debug)
        bearish = undefined
      }
    }
    return []
  }

  return [indicatorSpecs, strategy]
}
