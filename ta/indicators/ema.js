const talib = require('talib')
const ta = require('../index')

// TODO - I want to try a support/resistance strategy with the 960 EMA.

/**
 * Generate an EMA calculating function for the given period
 * @param {Number} period - length of the simple moving average
 * @returns {Function} a function that takes marketData and invertedMarketData and appends an EMA calculation to it
 */
module.exports = function emaFn(period) {
  let lastEma
  const multiplier = (2 / (period + 1))
  const key = `ema${period}`
  return function(md, imd) {
    if (md.close.length < period) return imd
    const amd = ta.marketDataTakeLast(md, period * 2) // take the minimum number of periods to generate 1 value
    if (!lastEma) {
      const emaSettings = ta.id.ema(amd, period)
      const ema = talib.execute(emaSettings)
      const last = ema.result.outReal.slice(ema.result.outReal.length - 1) // take only the last value
      lastEma = last[0]
      if (imd[key]) {
        imd[key].unshift(last[0])
      } else {
        imd[key] = last
      }
      return imd
    } else {
      // thanks to
      // https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
      const newEma = lastEma + multiplier * (imd.close[0] - lastEma)
      imd[key].unshift(newEma)
      lastEma = newEma
      return imd
    }
  }
}
