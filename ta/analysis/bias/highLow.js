/*
 * highLow looks for higher-lows or lower-highs to determine bullish or bearish
 * bias.  It's similar to my divergence code in that it uses Bollinger Bands as
 * a filter for finding worthy lows and highs.  It's simpler than divergence in
 * that it doesn't need an oscillator like RSI to compare.  Once the peaks or
 * valleys are found, they will be compared directly.
 */

const utils = require('../../utils');

/**
 * Determine bias by looking for higher-lows (bullish) or lower-highs (bearish).
 * @param {InvertedMarketData} imd - inverted market data that must contain upperBands and lowerBands in addition to high, low, and close
 * @param {Object} options - configuration for various thresholds (similar to what divergence takes)
 * @returns {String|undefined} bullish|bearish|undefined
 */
module.exports = function bias(imd, options) {
  // find 2 most recent highs
  // - Is the newer high lower?
  // find 2 most recent lows
  // - Is the newer low higher?
  // - If only one condition is true, that determines bias.
  // - If both conditions are true, the bias should be undefined.
}
