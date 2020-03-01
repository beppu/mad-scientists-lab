const talib = require('talib')
const ta = require('../index')

/**
 * Generate an RSI calculating function for the given period
 * @param {Number} period - length of the simple moving average
 * @returns {Function} a function that takes marketData and invertedMarketData and appends an EMA calculation to it
 */
module.exports = function rsiFn(period) {
  return function(md, imd) {
    if (md.close.length < period) return imd
    /*
      For RSI, you're supposed to need one candle more than the period length.
      https://www.macroption.com/rsi-calculation/
      However, I seem to need more.
     */
    const amd = ta.marketDataTakeLast(md, period*2) // take the minimum number of periods to generate 1 value
    const rsiSettings = ta.id.rsi(amd, period)
    const rsi = talib.execute(rsiSettings)
    const last = rsi.result.outReal.slice(rsi.result.outReal.length - 1) // take only the last value
    const key = `rsi${period}`
    if (imd[key]) {
      imd[key].unshift(last[0])
    } else {
      imd[key] = last
    }
    return imd
  }
}
