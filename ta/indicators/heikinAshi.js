const ta = require('../index')

// This is wrong.  The initial candle is a special case, and it may take many iterations to
// get the data to line up with TradingView.  The heart of the problem is that haOpen is derived
// from the previous value of haOpen.  How many iterations will I need to get this to converge?
// https://www.babypips.com/learn/forex/how-to-calculate-heikin-ashi (the ha open definition is wrong here)
// https://www.investopedia.com/terms/h/heikinashi.asp (this is better than the babypips explanation)
// BabyPips is wrong.
// Investopedia is right!
function calculateHeikinAshi(imd) {
  const open     = imd.open[0]
  const high     = imd.high[0]
  const low      = imd.low[0]
  const close    = imd.close[0]

  /*
    This is tricky, because imd.open[0] is the current open, but imd.haOpen[0] is the previous haOpen.
    The raw OHLC is faster than the ha OHLC which will be calculated here.
   */
  const haOpen1  = imd.haOpen  ? imd.haOpen[0]  : imd.open[0]   // special case for first candle
  const haClose1 = imd.haClose ? imd.haClose[0] : imd.close[0]

  const haOpen  = (haOpen1 + haClose1) / 2
  const haClose = (open + high + low + close) / 4
  const haHigh  = Math.max(high, haOpen, haClose)
  const haLow   = Math.min(low, haOpen, haClose)

  return { haOpen, haHigh, haLow, haClose }
}

module.exports = function heikinAshiFn() {

  function heikinAshiInsert(md, imd, state) {
    if (md.close.length < 1) return undefined
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
    if (md.close.length < 1) return undefined // XXX sma.js did period+1, but maybe that's wrong.  Maybe it should just be period.
    const val = calculateHeikinAshi(imd)
    imd.haOpen[0]  = val.haOpen
    imd.haHigh[0]  = val.haHigh
    imd.haLow[0]   = val.haLow
    imd.haClose[0] = val.haClose
    return { timestamp: imd.timestamp[0] }
  }

  return [heikinAshiInsert, heikinAshiUpdate, ['haOpen', 'haHigh', 'haLow', 'haClose']]
}

module.exports.calculateHeikinAshi = calculateHeikinAshi
