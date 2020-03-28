const utils = require('../../utils')

/**
 * Initialize a bias detection function using price relative to a moving average
 * and the slope of the moving average.
 *
 * @param {InvertedSeries|Array} prices - prices to compare against `maSeries`
 * @param {InvertedSeries|Array} maSeries - moving average to use for bias detection
 * @returns {String|undefined} bullish, bearish, or undefined
 */
module.exports = function movingAverageBias(prices, maSeries) {
  const ma    = maSeries[0]
  const close = prices[0]
  const slope = utils.slope([1, maSeries[1]], [2, maSeries[0]]) // make up x, and use closes for y

  if (close > ma && slope > 0) {
    return 'bullish'
  }
  if (close < ma && slope < 0) {
    return 'bearish'
  }
  return undefined
}
