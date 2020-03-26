const utils = require('../utils')
const time = require('../time')
const ta = require('../index')
const {missing} = utils

const __DEBUG__ = true

// This variable may contain insight into the most recent divergence check.
let debug = {}

/*

  These functions were originally written for bin/divergence. Their function
  signature was changed to facilitate adding more options in the future.

  Differences from the original:
  - The divergent indicator does not have to be 'rsi'.
    It's common for traders to look for divergence on many different indicators,
    so 'rsi' is no longer hardcoded.
  - However, if no indicator is specified, it defaults to 'rsi'.
  - gapThreshold is now an Array of 2 numbers instead of a string that must
    be split and parsed.
  - The functions were renamed as follows:
    detectRegularBearishDivergence => divergence.regularBearish
    detectRegularBullishDivergence => divergence.regularBullish
  - The options are now passed in an object instead of in positional parameters.

  Same as the original:
  - These functions take an InvertedMarketData structure, and require that
    bbands with the default settings have been calculated.
  - The InvertedMarketData must have high, low, and close series in it.

 */

/**
 * Detect regular bearish divergence
 * @param {InvertedMarketData} imd - inverted market data
 * @param {String} indicator - indicator that should diverge from price (default: 'rsi')
 * @param {Number} ageThreshold - number of candles that may elapse after initial detection
 * @param {Array<Number>} gapThreshold - a pair of integers representing the minimum and maximum gap between local highs.
 * @param {Number} peakThreshold - Distance allowed from the upper bband expressed as a percentage.  0 means the high must touch or exceed the upper bband.  The more positive this percentage is, the further from the upper bband the high is allowed to be.
 * @returns {Boolean|Object} truthy if bearish divergence was detected near index 0
 */
function regularBearish(imd, {indicator, ageThreshold, gapThreshold, peakThreshold}) {
  const osc = indicator ? indicator : 'rsi' // osc is short for oscillator
  if (missing(['upperBand', 'high', osc], imd)) return undefined
  const [minGap, maxGap] = gapThreshold
  const clusters = utils.findClusters(imd, 3, utils.highEnoughFn(peakThreshold)) // I only need the first two clusters.
  if (__DEBUG__) {
    debug.indicator     = osc
    debug.ageThreshold  = ageThreshold
    debug.gapThreshold  = gapThreshold
    debug.peakThreshold = peakThreshold
    debug.clusters      = clusters
    try {
      debug.clusterInfo = clusters.map((c) => {
        return {
          begin:  time.dt(imd.timestamp[c[c.length - 1]]),
          end:    time.dt(imd.timestamp[c[0]]),
          length: c.length
        }
      })
    }
    catch (e) {
      console.log(clusters, imd)
      process.exit(-1)
    }
  }
  if (clusters.length < 2) {
    // not enough local highs detected
    //console.warn('not enough clusters')
    return false
  }
  if (clusters[0][0] > ageThreshold) {
    // too far in the past
    //console.warn('divergence too far in past', clusters[0])
    return false
  }
  const high0 = utils.findLocalHigh(imd, clusters[0])
  let high1 = utils.findLocalHigh(imd, clusters[1])
  const osc0 = imd[osc][high0]
  let osc1 = imd[osc][high1]
  //console.log({ gapThreshold, high0, high1, distance: high1 - high0 })
  if (__DEBUG__) {
    debug.high0 = high0
    debug.osc0  = osc0
    debug.ts0   = time.dt(imd.timestamp[high0])
    debug.high1 = high1
    debug.osc1  = osc1
    debug.ts1   = time.dt(imd.timestamp[high1])
  }
  if (high1 - high0 < minGap) {
    if (clusters.length > 2) {
      // if high1 is too recent, try the next cluster
      high1 = utils.findLocalHigh(imd, clusters[2])
      if (high1 - high0 < minGap) return false
      osc1 = imd[osc][high1]
      if (__DEBUG__) {
        debug.high1 = high1
        debug.osc1  = osc1
        debug.ts1   = time.dt(imd.timestamp[high1])
      }
    } else {
      return false
    }
  }
  if (high1 - high0 > maxGap) {
    return false
  }
  const regularBearishDivergence = osc0 < osc1
  if (regularBearishDivergence) {
    return { offset: high0 } // XXX - I need to remember why I returned a truthy object instead of a plain boolean.  I think it had something to do with ta.scan.  There was a good reason for this.
  } else {
    return false
  }
}

/**
 * Detect regular bullish divergence
 * @param {InvertedMarketData} imd - inverted market data
 * @param {String} indicator - indicator that should diverge from price (default: 'rsi')
 * @param {Number} ageThreshold - number of candles that may elapse after initial detection
 * @param {Array<Number>} gapThreshold - a pair of integers representing the minimum and maximum gap between local highs.
 * @param {Number} peakThreshold - Distance allowed from the lower bband expressed as a percentage.  0 means the low must touch or exceed the lower bband.  The more positive this percentage is, the further from the lower bband the low is allowed to be.
 * @returns {Boolean|Object} truthy if bullish divergence was detected near index 0
 */
function regularBullish(imd, {indicator, ageThreshold, gapThreshold, peakThreshold}) {
  const osc = indicator ? indicator : 'rsi' // osc is short for oscillator
  if (missing(['lowerBand', 'low', osc], imd)) return undefined
  const [minGap, maxGap] = gapThreshold
  const clusters = utils.findClusters(imd, 3, utils.lowEnoughFn(peakThreshold)) // I only need the first two clusters.
  if (__DEBUG__) {
    debug.indicator     = osc
    debug.ageThreshold  = ageThreshold
    debug.gapThreshold  = gapThreshold
    debug.peakThreshold = peakThreshold
    debug.clusters      = clusters
    debug.clusterInfo = clusters.map((c) => {
      return {
        begin:  time.dt(imd.timestamp[c[c.length - 1]]),
        end:    time.dt(imd.timestamp[c[0]]),
        length: c.length
      }
    })
  }
  if (clusters.length < 2) {
    // not enough local highs detected
    return false
  }
  if (clusters[0][0] > ageThreshold) {
    return false
  }
  const low0 = utils.findLocalLow(imd, clusters[0])
  let low1 = utils.findLocalLow(imd, clusters[1])
  const osc0 = imd[osc][low0]
  let osc1 = imd[osc][low1]
  if (__DEBUG__) {
    debug.low0 = low0
    debug.osc0 = osc0
    debug.ts0  = time.dt(imd.timestamp[low0])
    debug.low1 = low1
    debug.osc1 = osc1
    debug.ts1  = time.dt(imd.timestamp[low1])
  }
  if (low1 - low0 < minGap) {
    if (clusters.length > 2) {
      // if low1 is too recent, try the next cluster
      low1 = utils.findLocalLow(imd, clusters[2])
      if (low1 - low0 < minGap) return false
      osc1 = imd[osc][low1]
      if (__DEBUG__) {
        debug.low1 = low1
        debug.osc1 = osc1
        debug.ts1  = time.dt(imd.timestamp[low1])
      }
    } else {
      return false
    }
  }
  if (low1 - low0 > maxGap) {
    return false
  }
  const regularBullishDivergence = osc0 > osc1
  if (regularBullishDivergence) {
    return { offset: low0 }
  } else {
    return false
  }
}

module.exports = {
  debug,
  regularBearish,
  regularBullish,
  // Someday, I may implement hidden bullish/bearish divergence as well.
}
