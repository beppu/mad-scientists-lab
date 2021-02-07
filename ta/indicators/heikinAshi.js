const ta = require('../index')

function calculateHeikinAshi(imd) {
  const open    = imd.open[0]
  const open1   = imd.open[1]
  const high    = imd.close[0]
  const low     = imd.low[0]
  const close   = imd.close[0]
  const close1  = imd.close[1]
  const haHigh  = Math.max(high, open, close)
  const haLow   = Math.min(low, open, close)
  const haOpen  = (open1 + close1) / 2
  const haClose = (open + high + low + close) / 4
  return {haOpen, haHigh, haLow, haClose}
}

module.exports = function heikinAshiFn() {

  function heikinAshiInsert(md, imd, state) {
    if (md.close.length < 2) return undefined
    const val = calculateHeikinAshi(imd)
    if (imd.haOpen) {
      // key exists; safely unshift
      imd.haOpen.unshift(val.haOpen)
      imd.haHigh.unshift(val.haHigh)
      imd.haLow.unshift(val.haLow)
      imd.haClose.unshift(val.haClose)
    } else {
      // key missing; initialize
      if (ta.isInvertedSeries(imd.close)) {
        imd.haOpen  = ta.createInvertedSeries()
        imd.haHigh  = ta.createInvertedSeries()
        imd.haLow   = ta.createInvertedSeries()
        imd.haClose = ta.createInvertedSeries()
        imd.haOpen.unshift(val.haOpen)
        imd.haHigh.unshift(val.haHigh)
        imd.haLow.unshift(val.haLow)
        imd.haClose.unshift(val.haClose)
      } else {
        imd.haOpen  = [ val.haOpen ]
        imd.haHigh  = [ val.haHigh ]
        imd.haLow   = [ val.haLow ]
        imd.haClose = [ val.haClose ]
      }
    }
    return { timestamp: imd.timestamp[0] } // Why am I returning the timestamp?
  }

  function heikinAshiUpdate(md, imd, state) {
    if (md.close.length < 2) return undefined // sma.js did period+1, but maybe that's wrong.  Maybe it should just be period.
    const val = calculateHeikinAshi(imd)
    imd.haOpen[0]  = val.haOpen
    imd.haHigh[0]  = val.haHigh
    imd.haLow[0]   = val.haLow
    imd.haClose[0] = val.haClose
    return { timestamp: imd.timestamp[0] }
  }

  return [heikinAshiInsert, heikinAshiUpdate, ['haOpen', 'haHigh', 'haLow', 'haClose']]
}
