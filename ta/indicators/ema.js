const talib = require('talib')
const ta = require('../index')

/**
 * Generate functions for inserting and updating EMA into an InvertedMarketData struct
 * @param {Number} period - length of the simple moving average
 * @returns {Array<Function>} an array with a function for inserting an EMA and a function for updating an EMA in that order
 */
module.exports = function emaFn(period) {
  const multiplier = (2 / (period + 1))
  const key = `ema${period}`
  function emaInsert(md, imd, state) {
    if (md.close.length < period) return undefined
    const amd = ta.marketDataTakeLast(md, period * 2) // take the minimum number of periods to generate 1 value
    if (!state) {
      const emaSettings = ta.id.ema(amd, period)
      const ema = talib.execute(emaSettings)
      const last = ema.result.outReal.slice(ema.result.outReal.length - 1) // take only the last value
      const newState = { lastEma: last[0] }
      if (imd[key]) {
        imd[key].unshift(last[0])
      } else {
        if (ta.isInvertedSeries(imd.close)) {
          imd[key] = ta.createInvertedSeries()
          imd[key].unshift(last[0])
        } else {
          imd[key] = last
        }
      }
      return newState
    } else {
      // thanks to
      // https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
      let lastEma = state.lastEma
      const newEma = lastEma + multiplier * (imd.close[0] - lastEma)
      imd[key].unshift(newEma)
      const newState = { lastEma: newEma, timestamp: imd.timestamp[0] }
      return newState
    }
  }
  function emaUpdate(md, imd, state) {
    if (md.close.length < period+1) return undefined
    let lastEma = state.lastEma
    const newEma = lastEma + multiplier * (imd.close[0] - lastEma)
    imd[key][0] = newEma
    const newState = { lastEma: newEma, timestamp: imd.timestamp[0] }
    return newState
  }
  return [emaInsert, emaUpdate, key]
}
