const ta = require('../index')
const talib = require('talib')

// influenced my rsi.js which doesn't use talib

function keyName(period) {
  return `hma${period}`
}

module.exports = function hmaFn(period=55) {
  const key = keyName(period)

  const sqPeriod = Math.round(Math.sqrt(period))

  const hmaIterate = function(md, imd, state) {
    // single calculation
    const amd = ta.marketDataTakeLast(md, period) // only needs period
    const wma1 = wma(amd, period / 2).map(w => w * 2)
    const wma2 = wma(amd, period)
    const diff = wma1.length - wma2.length
    const wma3 = []
    for (let i = wma2.length - 1; i >= 0; i--) {
      wma3.unshift(wma1[i + diff] - wma2[i])
    }
    return wma3
  }

  const hmaInsert = function(md, imd, state) {
    // create new candle
    // - occurs on first open
    if (md.close.length < period) return undefined
    const last = hmaIterate(md)
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
    return { timestamp: imd.timestamp[0] }
  }

  const hmaUpdate = function(md, imd, state) {
    // update existing candle
    if (md.close.length < period+1) return undefined // not yet enough data
    const last = hmaIterate(md)
    imd[key][0] = last[0]
    return { timestamp: imd.timestamp[0] }
  }

  return [hmaInsert, hmaUpdate, key]
}

// helpers
// ---------
function wma(md, period) {
  const settings = ta.id.wma(md, period)
  const wma = talib.execute(settings)
  return wma.result.outReal
}

/**

   # HMA = WMA(2*WMA(PRICE, N/2) - WMA(PRICE, N), SQRT(N))
   period = int(np.sqrt(window))
   # created wma array with NaN values for indexes < window value
   # hull_moving_averages = np.empty(window)
   # hull_moving_averages[:] = np.NAN
   wma1 = 2* wma(values, window/2)
   wma2 = wma(values, window)
   hull_moving_averages = wma((wma1 - wma2), period)
   return hull_moving_averages


   // WMA research
   // Does it need data beyond its declared period (like EMA)?
   s = []
   for (i=0; i<10; i++) { s.push(100) }
   for (i=1; i<11; i++) { s.push(100*i) }
   ss = s.map((close, i) => [i, 0, 0, 0, close, 0])
   md = ta.marketDataFromCandles(ss)
   settings = ta.id.wma(md, 10)
   r = talib.execute(settings)

   settings2 = clone(settings)
   settings2.inReal.splice(0, 5) // remove first 5 items
   settings2.endIdx = 14 // adjust params to end at right index
   r2 = talib.execute(settings2)

   // r.result and r2.result match up if you look at them from the end.

   // DUDE!  It looks like WMAs do *NOT* need data beyond
   // their declared period.  This means I can use talib for WMA and HMA,
   // and it won't be too computationally disgusting.  I can make
   // it faster later if necessary.

   */
