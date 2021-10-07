const ta = require('../index')
const talib = require('talib')
const {ha} = require('../analysis/candles')

// wrapper around ATR "moving average of the true range" for figuring volatility

const keyName = anchor => `atr${anchor}`

module.exports = function atrFn(period=14) {
  const key = keyName(period)

  const atrIterate = function(md, imd, state={}) {
    const amd = ta.marketDataTakeLast(md, period * 10, true)
    return atr(amd, period)
  }

  const atrInsert = function(md, imd, state) {
    // create new candle
    // insert atr value on candle close
    const atr = atrIterate(md, imd, state)
    if (imd[key]) {
      imd[key].unshift(atr)
    } else {
      imd[key] = [atr]
    }
    return { timestamp: imd.timestamp[0] }
  }

  const atrUpdate = function(md, imd, state) {
    // update existing candle
    if (md.close.length < 2) return undefined // " guard
    // update atr value
    imd[key][0] = atrIterate(md, imd, state)
    return { timestamp: imd.timestamp[0] }
  }

  return [atrInsert, atrUpdate, key]
}

function atr(md, period) {
  const settings = ta.id.atr(md, period)
  const atr = talib.execute(settings)
  return atr.result.outReal[atr.result.outReal.length - 1]
}
