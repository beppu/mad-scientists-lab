const ta = require('../index')

/**
 * Return the key to use in invertedMarketData
 * @param {Number} period - length of the simple moving average
 * @returns {String} name of the key to use in invertedMarketData
 */
function keyName(period) {
  if (period === 14) {
    return 'rsi'
  } else {
    return `rsi${period}`
  }
}

/**
 * Generate an RSI calculating function for the given period
 * @param {Number} period - length of the simple moving average
 * @returns {Function} a function that takes marketData and invertedMarketData and appends an EMA calculation to it
 */
module.exports = function rsiFn(period=14) {
  const key = keyName(period)

  // Calculate RSI for every iteration after the first one.
  const rsiIterate = function(md, state) {
    // ported from talib's ta_RSI.c
    // https://github.com/oransel/node-talib/blob/master/src/lib/src/ta_func/ta_RSI.c#L396-L411
    // that's why it's so mutatey
    let prevLoss = state.avgD
    let prevGain = state.avgU
    let last = md.close.length - 1
    let tempValue2 = md.close[last] - md.close[last - 1]
    prevLoss *= (period - 1)
    prevGain *= (period - 1)
    if (tempValue2 < 0) {
      prevLoss -= tempValue2
    } else {
      prevGain += tempValue2
    }
    prevLoss /= period
    prevGain /= period
    let tempValue1 = prevGain + prevLoss
    let rsiValue = 100*(prevGain/tempValue1)
    const newState = { rsiValue, avgU: prevGain, avgD: prevLoss, timestamp: md.timestamp[last] }
    return newState
  }

  // Insert a new candle to imd
  const rsiInsert = function(md, imd, state) {
    /*
      For RSI, you're supposed to need one candle more than the period length.
      https://www.macroption.com/rsi-calculation/
    */
    if (md.close.length < period+1) return undefined
    const amd = ta.marketDataTakeLast(md, period+1) // take the minimum number of periods to generate 1 value
    let rsiValue
    //console.log(arguments)
    if (typeof state === 'undefined') {
      // first time
      const ud = upsAndDowns(amd.close)
      const sumU = ud.up.reduce((m, a) => m + a)
      const sumD = ud.down.reduce((m, a) => m + a)
      const avgU = sumU / period
      const avgD = sumD / period
      const rs = avgU / avgD
      const rsiValue = 100 - (100 / (1 + rs))
      if (ta.isInvertedSeries(imd.close)) {
        imd[key] = ta.createInvertedSeries()
        imd[key].unshift(rsiValue)
      } else {
        imd[key] = [ rsiValue ]
      }
      const newState = { rsiValue, avgU, avgD, timestamp: imd.timestamp[0] }
      //console.log('first time', newState)
      return newState
    } else {
      // new candle on timeframe boundary
      const newState = rsiIterate(md, state)
      //console.log('next time', newState)
      imd[key].unshift(newState.rsiValue)
      return newState
    }
  }

  // Overwrite last RSI value in imd
  const rsiUpdate = function(md, imd, state) {
    if (md.close.length < period+2) return undefined
    const newState = rsiIterate(md, state)
    imd[key][0] = newState.rsiValue
    return newState
  }
  return [rsiInsert, rsiUpdate, key]
}

/**
 * Calculate up and down values for RSI
 * @param {Array<Candle>} candles - An array of candles in chronoligical order
 * @returns {Object<String,Array<Number>>} An object containing up and down arrays
 */
function upsAndDowns(closes) {
  const up = []
  const down = []
  let last
  closes.forEach((close) => {
    if (last === undefined) {
      last = close
    } else {
      if (close < last) {
        down.push(last - close)
        up.push(0)
      } else {
        up.push(close - last)
        down.push(0)
      }
      last = close
    }
  })
  return {up, down}
}

