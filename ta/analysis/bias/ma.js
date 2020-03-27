const utils = require('../../utils')

/**
 * Initialize a bias detection function using price relative to a moving average
 * and the slope of the moving average.
 *
 * @param {InvertedMarketData} imd - invertedMarketData
 * @param {InvertedSeries|Array} maSeries - moving average to use for bias detection
 * @returns {String|undefined} bullish, bearish, or undefined
 */
module.exports = function movingAverageBias(imd, maSeries) {
  const ma    = maSeries[0]
  const close = imd.close[0]
  const slope = utils.slope([1, imd.close[1]], [2, imd.close[0]]) // make up x, and use closes for y

  if (close > ma && slope > 0) {
    return 'bullish'
  }
  if (close < ma && slope < 0) {
    return 'bearish'
  }
  return undefined
}
