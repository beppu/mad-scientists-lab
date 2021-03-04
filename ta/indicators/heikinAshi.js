const ta = require('../index')
const utils = require('../utils')

// BabyPips is wrong.
// https://www.babypips.com/learn/forex/how-to-calculate-heikin-ashi (The haOpen definition is wrong here.)
// Investopedia is right!
// https://www.investopedia.com/terms/h/heikinashi.asp (haOpen is a special case on the first iteration.)

/*
  What's the interesting part about each case?

  - calculate insert first
    + haOpen1 and haClose1 are calculated using open[0] and close[0]
  - calculate insert
    + haOpen1 and haClose1 should come from imd.haOpen[?] and imd.haOpen[?]
  - calculate update first
    + haOpen1 and haClose1 are calculated using open[0] and close[0]
    + I have to be careful about offsets.  It's going to be different from insert.
  - calculate update
    + I think I have to be careful about offsets again.

*/

function calcInsertFirst(imd) {
  //console.log('calcInsertFirst', imd.timestamp.length)
  const open     = imd.open[0]
  const high     = imd.high[0]
  const low      = imd.low[0]
  const close    = imd.close[0]

  // The first iteration uses regular open and close since haOpen[1] and haClose[1] are not yet available.
  const haOpen1  = imd.open[0]   // special case for first candle
  const haClose1 = imd.close[0]

  const haOpen  = utils.round(((haOpen1 + haClose1) / 2), 0.5)
  const haClose = utils.round(((open + high + low + close) / 4), 0.5)
  const haHigh  = utils.round(Math.max(high, haOpen, haClose), 0.5)
  const haLow   = utils.round(Math.min(low, haOpen, haClose), 0.5)

  return { haOpen, haHigh, haLow, haClose }
}

// Exactly the same as calcInsertFirst?
function calcUpdateFirst(imd) {
  //console.log('calcUpdateFirst', imd)
  return calcInsertFirst(imd)
}

function calcInsert(imd) {
  //console.log('calcInsert', imd)
  const open     = imd.open[0]
  const high     = imd.high[0]
  const low      = imd.low[0]
  const close    = imd.close[0]

  /*
    At insert time on a non-first candle,
    imd.open[0] is the current open, but imd.haOpen[0] is the previous haOpen.
    The raw OHLC is one step ahead of the ha OHLC which will be calculated here.
  */
  const haOpen1  = imd.haOpen[0]
  const haClose1 = imd.haClose[0]

  const haOpen  = utils.round(((haOpen1 + haClose1) / 2), 0.5)
  const haClose = utils.round(((open + high + low + close) / 4), 0.5)
  const haHigh  = utils.round(Math.max(high, haOpen, haClose), 0.5)
  const haLow   = utils.round(Math.min(low, haOpen, haClose), 0.5)

  return { haOpen, haHigh, haLow, haClose }
}

function calcUpdate(imd) {
  //console.log('calcUpdate', imd)
  const open     = imd.open[0]
  const high     = imd.high[0]
  const low      = imd.low[0]
  const close    = imd.close[0]

  /*
    At update time on a non-first candle,
    imd.open[0] is still the current open, and imd.haOpen[0] is the current haOpen.
    Now, we have to go one candle back for haOpen1 and haClose1
  */
  const haOpen1  = imd.haOpen[1]
  const haClose1 = imd.haClose[1]

  const haOpen  = utils.round(((haOpen1 + haClose1) / 2), 0.5)
  const haClose = utils.round(((open + high + low + close) / 4), 0.5)
  const haHigh  = utils.round(Math.max(high, haOpen, haClose), 0.5)
  const haLow   = utils.round(Math.min(low, haOpen, haClose), 0.5)

  return { haOpen, haHigh, haLow, haClose }
}

module.exports = function heikinAshiFn() {

  function heikinAshiInsert(md, imd, state) {
    if (md.close.length < 1) return undefined
    let first // is this the first candle?
    let val
    if (state === undefined) {
      first = true
      val = calcInsertFirst(imd)
    } else if (state.first) {
      first = false
      val = calcInsert(imd)
    } else {
      first = false
      val = calcInsert(imd)
    }
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
    return { timestamp: imd.timestamp[0], first } // Why am I returning the timestamp?
  }

  function heikinAshiUpdate(md, imd, state) {
    if (imd.close.length < 2) return undefined
    let val, first
    if (state === undefined) {
      val = calcUpdateFirst(imd)
      first = true
    } else {
      val = calcUpdate(imd)
      first = false
    }
    imd.haOpen[0]  = val.haOpen
    imd.haHigh[0]  = val.haHigh
    imd.haLow[0]   = val.haLow
    imd.haClose[0] = val.haClose
    return { timestamp: imd.timestamp[0], first }
  }

  return [heikinAshiInsert, heikinAshiUpdate, ['haOpen', 'haHigh', 'haLow', 'haClose']]
}

module.exports

/*

  md = ta.marketDataFromCandles([])
  imd = ta.invertedMarketData(md)
  state = undefined
  [insert, update] = indicators.heikinAshi()
  c = candles[0]
  md = ta.marketDataAppendCandle(md, c)
  imd = ta.invertedAppendCandle(imd, c)
  state = insert(md, imd, state)


  start = DateTime.fromObject({ year: 2021, month: 2, day: 18 })
  ta.loadCandles('bybit', 'BTC/USD', '1h', start.toMillis(), 200).then((cs) => x.cs1h = cs)
  ta.loadCandles('bybit', 'BTC/USD', '4h', start.toMillis(), 200).then((cs) => x.cs4h = cs)
  c00 = x.cs1h[0]
  c01 = pipeline.mergeCandle(c00, x.cs1h[1])
  c02 = pipeline.mergeCandle(c01, x.cs1h[2])
  c03 = pipeline.mergeCandle(c02, x.cs1h[3]) // This looks perfect in the repl. <2021-02-24>
  c10 = x.cs1h[4]
  c11 = pipeline.mergeCandle(c10, x.cs1h[5])
  c12 = pipeline.mergeCandle(c11, x.cs1h[6])
  c13 = pipeline.mergeCandle(c12, x.cs1h[7]) // This also looks perfect.

  ha = reload('./indicators/heikinAshi')
  [insert, update] = indicators.heikinAshi()
  md = ta.marketDataFromCandles([])
  imd = ta.invertedMarketData(md)
  prevState = undefined
  state = undefined

  md = ta.marketDataAppendCandle(md, c00)
  imd = ta.invertedAppendCandle(imd, c00)
  state = insert(md, imd, prevState)

  md = ta.marketDataUpdateCandle(md, c01)
  imd = ta.invertedUpdateCandle(imd, c01)
  state = update(md, imd, prevState)

  md = ta.marketDataUpdateCandle(md, c02)
  imd = ta.invertedUpdateCandle(imd, c02)
  state = update(md, imd, prevState)

  md = ta.marketDataUpdateCandle(md, c03)
  imd = ta.invertedUpdateCandle(imd, c03)
  state = update(md, imd, prevState) // 3 out of 4 with haOpen being off (but that was expected)

  // How many iterations do I have to do to get haOpen close?
  prevState = state
  md = ta.marketDataAppendCandle(md, c10)
  imd = ta.invertedAppendCandle(imd, c10)
  state = insert(md, imd, prevState)

  md = ta.marketDataUpdateCandle(md, c11)
  imd = ta.invertedUpdateCandle(imd, c11)
  state = update(md, imd, prevState)

  md = ta.marketDataUpdateCandle(md, c12)
  imd = ta.invertedUpdateCandle(imd, c12)
  state = update(md, imd, prevState)

  md = ta.marketDataUpdateCandle(md, c13)
  imd = ta.invertedUpdateCandle(imd, c13)
  state = update(md, imd, prevState)  // 3 out of 4 again, and haOpen is off but getting closer.

 */
