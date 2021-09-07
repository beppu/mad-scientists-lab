const ta = require('../index')
const talib = require('talib')
const {ha} = require('../analysis/candles')

// TODO indicate divergent trends beween volume & price?
// - should that be part of strategy or internal for ease-of-use?

const keyName = period => `obv${period}`

module.exports = function obvFn(period=55) {
  const key = keyName(period)

  const obvIterate = function(md, imd, state) {
    const
      lastObv = imd[key] && imd[key][0] || 0,
      curObv  = imd.volume[0] || 0,
      cur     = imd.close[0]  || 0,
      last    = imd.close[1]  || 0
    // TODO how can we reset based on anchors?
    // if ((period | peak | valley | price) % N === 0) lastObv = 0
    if (cur === last) {
      // obv remains unchanged
      return lastObv
    } else {
      // bull|bear'ish, so-- adjust obv:
      return cur > last
        ? lastObv + curObv
        : lastObv - curObv
    }
  }

  const obvInsert = function(md, imd, state) {
    // create new candle
    if (md.close.length < period) return undefined // not yet enough data
    // insert initial obv value
    const obv = obvIterate(md, imd, state)
    if (imd[key]) {
      imd[key].unshift(obv)
    } else {
      imd[key] = []
      imd[key].unshift(obv)
    }
    return { timestamp: imd.timestamp[0] }
  }

  const obvUpdate = function(md, imd, state) {
    // update existing candle
    if (md.close.length < period+1) return undefined // " guard
    // update obv value
    imd[key].unshift(obvIterate(md, imd, state))
    return { timestamp: imd.timestamp[0] }
  }

  return [obvInsert, obvUpdate, key]
}
