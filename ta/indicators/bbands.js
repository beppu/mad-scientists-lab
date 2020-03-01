const talib = require('talib')
const ta = require('../index')

// TODO - I want to try a support/resistance strategy with the 960 SMA.

/**
 * Generate an BBANDS calculating function for the given period
 * @param {Number} period - length of the simple moving average
 * @returns {Function} a function that takes marketData and invertedMarketData and appends an BBANDS calculation to it
 */
module.exports = function bbandsFn(period) {
  return function(md, imd) {
    if (md.close.length < period) return imd
    const amd = ta.marketDataTakeLast(md, period) // take the minimum number of periods to generate 1 value
    const bbandsSettings = ta.id.bbands(amd, period)
    const bbands = talib.execute(bbandsSettings)
    const lastUpperBand = bbands.result.outRealUpperBand.slice(bbands.result.outRealUpperBand.length - 1) // take only the last value
    const lastMiddleBand = bbands.result.outRealMiddleBand.slice(bbands.result.outRealMiddleBand.length - 1) // take only the last value
    const lastLowerBand = bbands.result.outRealLowerBand.slice(bbands.result.outRealLowerBand.length - 1) // take only the last value
    const key1 = `upperBand${period}`
    const key2 = `middleBand${period}`
    const key3 = `lowerBand${period}`
    if (imd[key1]) {
      imd[key1].unshift(lastUpperBand[0])
      imd[key2].unshift(lastMiddleBand[0])
      imd[key3].unshift(lastLowerBand[0])
    } else {
      imd[key1] = lastUpperBand
      imd[key2] = lastMiddleBand
      imd[key3] = lastLowerBand
    }
    return imd
  }
}

