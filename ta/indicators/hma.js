const ta = require('../index')
const talib = require('talib')

// influenced my rsi.js which doesn't use talib

function keyName(period) {
  return `hma${period}`
}

module.exports = function hmaFn(period=55) {
  const key = keyName(period)

  const hmaIterate = function(imd, state) {
    // TODO Implement
    // NOTE rsi.js used md to make it easier to port the C code from talib to JS.  hma.js should be able to use imd instead.
    const newState = {}
    return newState
  }

  const hmaInsert = function(md, imd, state) {
    // TODO Implement
    const newState = {}
    return newState
  }

  const hmaUpdate = function(md, imd, state) {
    if (md.close.length < period+2) return undefined
    const newState = hmaIterate(imd, state)
    imd[key][0] = newState.hmaValue
    return newState
  }
}

/**

   # HMA = WMA(2*WMA(PRICE, N/2) - WMA(PRICE, N), SQRT(N))
   period = int(np.sqrt(window))
   # created wma array with NaN values for indexes < window value
   # hull_moving_averages = np.empty(window)
   # hull_moving_averages[:] = np.NAN
   wma1 = 2* wma(values, window/2)
   wma2 = wma(values, window)
   hull_moving_averages = wma((wma1 - wma2), period)
   return hull_moving_averages

   */
