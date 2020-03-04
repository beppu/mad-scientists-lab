const talib = require('talib')
const ta = require('../index')

function keySuffix(period) {
  if (period === 20) {
    return ''
  } else {
    return period.toString()
  }
}

const EMPTY_STATE = {}

/**
 * Generate functions for inserting and updating Bollinger Band data into invertedMarketData
 * @param {Number} period - length of the simple moving average
 * @returns {Array<Function>} An array of two functions for inserting and updating data
 */
module.exports = function bbandsFn(period) {
  const key1 = `upperBand${keySuffix(period)}`
  const key2 = `middleBand${keySuffix(period)}`
  const key3 = `lowerBand${keySuffix(period)}`

  function bbandsIterate(md) {
    const amd = ta.marketDataTakeLast(md, period) // take the minimum number of periods to generate 1 value
    const bbandsSettings = ta.id.bbands(amd, period)
    const bbands = talib.execute(bbandsSettings)
    const lastUpperBand = bbands.result.outRealUpperBand.slice(bbands.result.outRealUpperBand.length - 1) // take only the last value
    const lastMiddleBand = bbands.result.outRealMiddleBand.slice(bbands.result.outRealMiddleBand.length - 1) // take only the last value
    const lastLowerBand = bbands.result.outRealLowerBand.slice(bbands.result.outRealLowerBand.length - 1) // take only the last value
    return { lastUpperBand, lastMiddleBand, lastLowerBand }
  }

  function bbandsInsert(md, imd, state) {
    if (md.close.length < period) return undefined
    const {lastUpperBand, lastMiddleBand, lastLowerBand} = bbandsIterate(md)
    if (imd[key1]) {
      imd[key1].unshift(lastUpperBand[0])
      imd[key2].unshift(lastMiddleBand[0])
      imd[key3].unshift(lastLowerBand[0])
    } else {
      imd[key1] = lastUpperBand
      imd[key2] = lastMiddleBand
      imd[key3] = lastLowerBand
    }
    return EMPTY_STATE
  }

  function bbandsUpdate(md, imd, state) {
    const {lastUpperBand, lastMiddleBand, lastLowerBand} = bbandsIterate(md)
    imd[key1][0] = lastUpperBand[0]
    imd[key2][0] = lastMiddleBand[0]
    imd[key3][0] = lastLowerBand[0]
    return EMPTY_STATE
  }
  return [bbandsInsert, bbandsUpdate]
}

