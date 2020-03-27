const utils = require('../../utils')

/**
 * Initialize a bias detection function using price relative to a moving average
 * and the slope of the moving average.
 *
 * @param {String} timeframe - duration of candle
 * @param {String} maType - type of moving average.  (ema or sma)
 * @param {Number} period - length of moving average
 * @returns {String|undefined} bullish, bearish, or undefined
 */
module.exports = function init(timeframe, maType, period) {
  const imdKey = `imd${timeframe}`
  const maKey  = `${maType}${period}`

  return function movingAverageBias(marketState) {
    const imd   = marketState[imdKey]
    const close = imd.close[0]
    const ma    = imd[maKey][0]
    const slope = utils.slope([1, imd.close[1]], [2, imd.close[0]]) // make up x, and use closes for y

    if (close > ma && slope > 0) {
      return 'bullish'
    }
    if (close < ma && slope < 0) {
      return 'bearish'
    }
    return undefined
  }
}
