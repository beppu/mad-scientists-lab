const talib = require('talib')
const ta = require('../index')

// TODO - I want to try a support/resistance strategy with the 960 SMA.

const EMPTY_STATE = {}

/**
 * Generate an SMA calculating function for the given period
 * @param {Number} period - length of the simple moving average
 * @returns {Function} a function that takes marketData and invertedMarketData and appends an SMA calculation to it
 */
module.exports = function smaFn(period) {
  const key = `sma${period}`

  function smaIterate(md) {
    const amd = ta.marketDataTakeLast(md, period) // take the minimum number of periods to generate 1 value
    const smaSettings = ta.id.sma(amd, period)
    const sma = talib.execute(smaSettings)
    const last = sma.result.outReal.slice(sma.result.outReal.length - 1) // take only the last value
    return last
  }

  function smaInsert(md, imd, state) {
    if (md.close.length < period) return undefined
    const last = smaIterate(md)
    if (imd[key]) {
      imd[key].unshift(last[0])
    } else {
      imd[key] = last
    }
    return EMPTY_STATE
  }

  function smaUpdate(md, imd, state) {
    const last = smaIterate(md)
    const key = `sma${period}`
    imd[key][0] = last[0]
    return EMPTY_STATE
  }

  return [smaInsert, smaUpdate]
}

/*

  This is about as close to a streaming implementation I can achieve with talib.
  It doesn't actually stream, but it *does* keep the amount of calculation down
  to the minimum required by talib.

  My biggest concern now is that these calculations are correct. Once I feel
  good about the correctness of this code, I can implement the core set of
  indicators that I use.

*/
