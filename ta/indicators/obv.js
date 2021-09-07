const ta = require('../index')
const talib = require('talib')
const {ha} = require('../analysis/candles')

// XXX works on heikinashi candles
// TODO indicate divergent trends beween volume & price?
// - should that be part of strategy or internal for ease-of-use?

const keyName = period => `obv${period}`

module.exports = function obvFn(period=55) {
  const key = keyName(period)

  const obvIterate = function(md, imd, state) {
    const
      lastObv = imd[key] || 0,
      curObv  = imd.volume[0]
    // TODO how can we reset based on anchors?
    // if ((period | peak | valley | price) % N === 0) lastObv = 0
    if (ha.isNeutral(imd)) {
      // obv remains unchanged
      return lastObv
    } else {
      // bull|bear'ish, so-- adjust obv:
      return ha.isBullish(imd)
        ? lastObv + curObv
        : lastObv - curObv
    }
  }

  const obvInsert = function(md, imd, state) {
    // create new candle
    if (md.close.length < period) return undefined // not yet enough data
    // insert initial obv value
    imd[key] = obvIterate(md, imd, state)
    return { timestamp: imd.timestamp[0] }
  }

  const obvUpdate = function(md, imd, state) {
    // update existing candle
    if (md.close.length < period+1) return undefined // " guard
    // update obv value
    imd[key] = obvIterate(md, imd, state)
    return { timestamp: imd.timestamp[0] }
  }

  return [obvInsert, obvUpdate, key]
}
