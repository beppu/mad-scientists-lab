const talib = require('talib')
const ta = require('../index')
const heikinAshi = require('./heikinAshi')

let candles
let candles4h

function initializeCandles() {
  // I think these were from BitMEX, but I don't remember what timeframe these were.  I could do some math to find out later.
  candles = require('../tests/fixtures/candles.json')
  // These are from bybit, and they're 4h candles that start at 1612612800000 as you can infer from the filename.
  candles4h = require('../tests/fixtures/BTCUSD/4h/1612612800000.json')
}

beforeEach(() => {
  initializeCandles()
})

test('the right number of heikin ashi values should be calculated', () => {
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const [insert, update] = heikinAshi()
  let state
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    state = insert(md, imd, state)
  })
  expect(imd.open).toHaveLength(25)
  expect(imd.haOpen).toHaveLength(25)
})

test('the first iteration should create a heikin ashi candle', () => {
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const [insert, update] = heikinAshi()
  let state
  let c = candles4h[0]
  md = ta.marketDataAppendCandle(md, c)
  imd = ta.invertedAppendCandle(imd, c)
  state = insert(md, imd, state)
  expect(imd.open).toHaveLength(1)
  expect(imd.haOpen).toHaveLength(1)
})

test('update should work', () => {
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const [insert, update] = heikinAshi()
  let state
  let c = candles4h[0]
  md = ta.marketDataAppendCandle(md, c)
  imd = ta.invertedAppendCandle(imd, c)
  state = insert(md, imd, state)
  //console.log(imd)
  c = candles4h[1]
  md = ta.marketDataUpdateCandle(md, c)
  imd = ta.invertedUpdateCandle(imd, c)
  state = update(md, imd, state)
  //console.log(imd)
})

/*
  md = ta.marketDataFromCandles([])
  imd = ta.invertedMarketData(md)
  state = undefined
  [insert, update] = indicators.heikinAshi()
  function ha(imd, n) { return { open: imd.haOpen[n], high: imd.haHigh[n], low: imd.haLow[n], close: imd.haClose[n] } }

  // load a few candles
  d = DateTime.fromObject({ year: 2021, month: 1, day: 11 })
  ta.loadCandles('bybit', 'BTC/USD', '4h', d.toMillis(), 200).then((cs) => x.cs = cs)
  // calculations will be very different from TradingView due to the small dataset.
  x.cs.forEach((c) => { md = ta.marketDataAppendCandle(md, c); imd = ta.invertedAppendCandle(imd, c); state = insert(md, imd, state) })

  // or load a ton of candles
  ha = reload('./indicators/heikinAshi')
  [insert, update] = ha()
  d = DateTime.fromObject({ year: 2021, month: 2, day: 18 })
  pipeline.loadCandlesFromFS('data', 'bybit', 'BTC/USD', '4h', d).then((nextCandle) => x.nextCandle = nextCandle)
  md = ta.marketDataFromCandles([])
  imd = ta.invertedMarketData(md)
  state = undefined
  function loop(c) {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    state = insert(md, imd, state);
    return { md, imd }
  }

  pipeline.runLoop(loop, x.nextCandle).then((ms) => x.ms = ms)


*/

/*

  // more debuggin'
  calc = indicators.heikinAshi.calculateHeikinAshi
  function ohlc(imd, i=0) { return { open: imd.open[i], high: imd.high[i], low: imd.low[i], close: imd.close[i] } }
  candles4h = require('./tests/fixtures/BTCUSD/4h/1612612800000.json')
  md = ta.marketDataFromCandles(candles4h)
  imd = ta.invertedMarketData(md)
  imd1 = ta._previousImd(imd)
  imd2 = ta._previousImd(imd1)

 */

// Use some known and recent candles that can be cross-referenced with TradingView.
// 4hcandles.json
// ts 1612612800000 = 2021-02-06 4:00 PST
// firstCandle = [1612612800000, 40272.5, 40920, 39956.5, 40919.5, 23145.454049059164]
// use this for more tests later.

