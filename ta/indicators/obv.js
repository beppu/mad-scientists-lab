const ta = require('../index')
const talib = require('talib')
const {ha} = require('../analysis/candles')

// TODO indicate divergent trends beween volume & price?
// - should that be part of strategy or internal for ease-of-use?

const keyName = anchor => `obv${anchor}`
const isDoji = (md) => {
  const indicatorSettings = ta.id.cdldoji(md)
  const r                 = talib.execute(indicatorSettings)
  return r.result.outInteger[0] === 100
}

module.exports = function obvFn(anchor='') {
  const key = keyName(anchor)

  const obvIterate = function(md, imd, state={}) {
    const anchoredValue = val => state.resetAnchor ? 0 : val || 0
    const
      lastObv = anchoredValue(imd[key] && imd[key][0]),
      curObv  = anchoredValue(imd.volume[0]),
      cur     = anchoredValue(imd.close[0]),
      last    = anchoredValue(imd.close[1])
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
    let resetAnchor = false
    if (md.close.length < 1)
      // not yet enough data
      return undefined
    // reset based on anchors
    if (anchor === 'doji' && isDoji(md))
      resetAnchor = true
    // insert obv value on candle close
    const obv = obvIterate(md, imd, state)
    if (imd[key]) {
      imd[key].unshift(obv)
    } else {
      imd[key] = [obv]
    }
    return { timestamp: imd.timestamp[0], resetAnchor }
  }

  const obvUpdate = function(md, imd, state) {
    // update existing candle
    if (md.close.length < 2) return undefined // " guard
    // update obv value
    imd[key][0] = obvIterate(md, imd, state)
    return { timestamp: imd.timestamp[0] }
  }

  return [obvInsert, obvUpdate, key]
}
