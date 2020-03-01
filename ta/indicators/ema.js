const talib = require('talib')
const ta = require('../index')

// TODO - I want to try a support/resistance strategy with the 960 EMA.

/**
 * Generate an EMA calculating function for the given period
 * @param {Number} period - length of the simple moving average
 * @returns {Function} a function that takes marketData and invertedMarketData and appends an EMA calculation to it
 */
module.exports = function emaFn(period) {
  return function(md, imd) {
    if (md.close.length < period) return imd
    /*
     Due to how EMA is calculated, it actually needs double the number of
     candles to generate an accurate calculation in a streaming context. The
     most recent EMA value recursively depends on the previous EMA value.
     https://www.thebalance.com/simple-exponential-and-weighted-moving-averages-1031196
    */
    const amd = ta.marketDataTakeLast(md, period * 2) // take the minimum number of periods to generate 1 value
    const emaSettings = ta.id.ema(amd, period)
    const ema = talib.execute(emaSettings)
    const last = ema.result.outReal.slice(ema.result.outReal.length - 1) // take only the last value
    const key = `ema${period}`
    if (imd[key]) {
      imd[key].unshift(last[0])
    } else {
      imd[key] = last
    }
    return imd
  }
}
