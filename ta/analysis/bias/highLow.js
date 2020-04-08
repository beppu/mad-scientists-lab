/*
 * highLow looks for higher-lows or lower-highs to determine bullish or bearish
 * bias.  It's similar to my divergence code in that it uses Bollinger Bands as
 * a filter for finding worthy lows and highs.  It's simpler than divergence in
 * that it doesn't need an oscillator like RSI to compare.  Once the peaks or
 * valleys are found, they will be compared directly.
 */

const utils = require('../../utils');
const {missing} = utils

/**
 * Do higher lows exist in recent price action?
 * @param {InvertedMarketData} imd - inverted market data in any timeframe you want
 * @param {Object} options - fine tuning
 * @param {Number} options.ageThreshold - How many candles back may the first cluster be?  (not the extreme, but the cluster of candles the extreme belongs to)
 * @param {Array<Number>} options.gapThreshold - min/max candles between extremes
 * @param {Number} options.peakThreshold - % distance price is allowed to be from the lower bband
 * @returns {Object|Boolean} If higher lows exist, return an an object describing the condition; else return false.
 */
function higherLows(imd, {ageThreshold, gapThreshold, peakThreshold}) {
  const [minGap, maxGap] = gapThreshold
  const clusters = utils.findClusters(imd, 3, utils.lowEnoughFn(peakThreshold))
  if (clusters.length < 2) {
    // not enough local highs detected
    return false
  }
  if (clusters[0][0] > ageThreshold) {
    return false
  }
  const low0 = utils.findLocalLow(imd, clusters[0])
  let low1 = utils.findLocalLow(imd, clusters[1])
  if (low1 - low0 < minGap) {
    if (clusters.length > 2) {
      // if low1 is too recent, try the next cluster
      low1 = utils.findLocalLow(imd, clusters[2])
      if (low1 - low0 < minGap) return false
    } else {
      return false
    }
  }
  if (low1 - low0 > maxGap) {
    return false
  }
  const price0 = imd.low[low0]
  const price1 = imd.low[low1]
  const found  = price0 > price1
  return {
    found,
    price0,
    price1,
    ts0: imd.timestamp[low0],
    ts1: imd.timestamp[low1]
  }
}

/**
 * Do lower highs exist in recent price action?
 * @param {InvertedMarketData} imd - inverted market data in any timeframe you want
 * @param {Object} options - fine tuning
 * @param {Number} options.ageThreshold - How many candles back may the first cluster be?  (not the extreme, but the cluster of candles the extreme belongs to)
 * @param {Array<Number>} options.gapThreshold - min/max candles between extremes
 * @param {Number} options.peakThreshold - % distance price is allowed to be from the lower bband
 * @returns {Object|Boolean} If lower highs exist, return an an object describing the condition; else return false.
 */
function lowerHighs(imd, {ageThreshold, gapThreshold, peakThreshold}) {
  const [minGap, maxGap] = gapThreshold
  const clusters = utils.findClusters(imd, 3, utils.highEnoughFn(peakThreshold))
  if (clusters.length < 2) {
    // not enough local highs detected
    return false
  }
  if (clusters[0][0] > ageThreshold) {
    return false
  }
  const high0 = utils.findLocalHigh(imd, clusters[0])
  let high1 = utils.findLocalHigh(imd, clusters[1])
  if (high1 - high0 < minGap) {
    if (clusters.length > 2) {
      // if high1 is too recent, try the next cluster
      high1 = utils.findLocalHigh(imd, clusters[2])
      if (high1 - high0 < minGap) return false
    } else {
      return false
    }
  }
  if (high1 - high0 > maxGap) {
    return false
  }
  const price0 = imd.high[high0]
  const price1 = imd.high[high1]
  const found  = price0 < price1
  return {
    found,
    price0,
    price1,
    ts0: imd.timestamp[high0],
    ts1: imd.timestamp[high1]
  }
}

/**
 * Determine bias by looking for higher-lows (bullish) or lower-highs (bearish).
 * @param {InvertedMarketData} imd - inverted market data that must contain upperBands and lowerBands in addition to high, low, and close
 * @param {Object} options - configuration for various thresholds (similar to what divergence takes)
 * @returns {String|undefined} 'bullish' or 'bearish'
 */
function detect(imd, options) {
  if (missing(['lowerBand', 'low', 'upperBand', 'high'], imd)) {
    return undefined
  }
  // find 2 most recent highs
  // - Is the newer high lower?
  const loRes = lowerHighs(imd, options)
  // find 2 most recent lows
  // - Is the newer low higher?
  const hiRes = higherLows(imd, options)
  // - If only one condition is true, that determines bias.
  if (loRes && !hiRes) {
    return 'bullish'
  }
  if (hiRes && !loRes) {
    return 'bearish'
  }
  // - If both conditions are true, the more recent one should win.
  if (hiRes && loRes) {
    // - But first, if they're tied, undefined
    if (hiRes.ts0 == loRes.ts0) {
      return undefined
    } else {
      return hiRes.ts0 > loRes.ts0 ? 'bullish' : 'bearish'
    }
  } else {
    // If neither are true, that's weird, but also undefined
    return undefined
  }
}

module.exports = {
  higherLows,
  lowerHighs,
  detect // this is the main function people should be using
}
