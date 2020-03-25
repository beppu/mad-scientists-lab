const {DateTime} = require('luxon')
const talib = require('talib')
const pipeline = require('./pipeline')
const ta = require('./index')
const ema = require('./indicators/ema')

// This contains 25 1h candles
let candles = require('./tests/fixtures/candles.json')

test("Aggregation functions should generate the right number of candles", () => {
  const ax2h = pipeline.aggregatorFn('2h')
  const ax4h = pipeline.aggregatorFn('4h')
  const md2h = ta.marketDataFromCandles([])
  const md4h = ta.marketDataFromCandles([])
  candles.forEach((c) => {
    const dt = DateTime.fromMillis(c[0])
    const [candle2h, isBoundary2h] = ax2h(c)
    if (isBoundary2h) {
      //console.log(`${dt.toISOTime()} is on 2h boundary`)
      ta.marketDataAppendCandle(md2h, candle2h)
      //console.log(md2h.close.length)
    } else {
      //console.log(`${dt.toISOTime()}`)
      ta.marketDataUpdateCandle(md2h, candle2h)
      //console.log('>', md2h.close.length)
    }
  })
  candles.forEach((c) => {
    const dt = DateTime.fromMillis(c[0])
    const [candle4h, isBoundary4h] = ax4h(c)
    if (isBoundary4h) {
      //console.log(`${dt.toISOTime()} is on 4h boundary`)
      ta.marketDataAppendCandle(md4h, candle4h)
      //console.log(md4h.close.length)
    } else {
      //console.log(`${dt.toISOTime()}`)
      ta.marketDataUpdateCandle(md4h, candle4h)
      //console.log('>', md4h.close.length)
    }
  })
  //console.log(md4h.close)
  expect(md2h.close.length).toBeLessThan(candles.length/2 + 1)
  expect(md4h.close.length).toBeLessThan(candles.length/4 + 1)
})

test("Aggregation should combine candles correctly", () => {
  // Here, I assume the first candle is on a timeframe boundary and the second one is not.
  // I know this is true with the current test fixture.
  const ax2h = pipeline.aggregatorFn('2h')
  ax2h(candles[0])
  const [candle2h] = ax2h(candles[1])

  /*
    0 timestamp
    1 open
    2 high
    3 low
    4 close
    5 volume
  */

  // timestamp
  expect(candle2h[0]).toEqual(candles[0][0])
  // open
  expect(candle2h[1]).toEqual(candles[0][1])
  // high
  const high = candles[0][2] > candles[1][2] ? candles[0][2] : candles[1][2]
  expect(candle2h[2]).toEqual(high)
  // low
  const low = candles[0][3] < candles[1][3] ? candles[0][3] : candles[1][3]
  expect(candle2h[3]).toEqual(low)
  // close
  expect(candle2h[4]).toEqual(candles[1][4])
  // volume
  expect(candle2h[5]).toEqual(candles[0][5] + candles[1][5])
})

test("pipeline.mainLoopFn should be able to take an empty indicatorSpecs", () => {
  const s = pipeline.mainLoopFn('1h', {  })
  // If it doesn't crash, we're good.
})

test("pipeline.mainLoopFn should return a function that calculates correctly", () => {
  let state
  const baseTimeframe = '1h'
  const indicatorSpecs = { '1h': [ ['rsi', 14], ['sma', 20] ], '2h': [ ['bbands', 20 ], ['ema', 9] ], inverted: true }
  const iterate = pipeline.mainLoopFn(baseTimeframe, indicatorSpecs)
  candles.forEach((c) => state = iterate(c))
  expect(typeof iterate).toEqual("function")
  expect(state.baseTimeframe).toEqual(baseTimeframe)
  expect(state.md1h.timestamp).toHaveLength(candles.length)
  expect(state.imd1h.high).toHaveLength(candles.length)
  expect(state.aggregator1h).toBeUndefined()
  expect(state.indicators1h).toHaveLength(2)
  expect(state.indicators2h).toHaveLength(2)
  expect(state.imd2h.close).toHaveLength(13)
  expect(state.imd2h.ema9).toHaveLength(5)
  expect(state.imd2h.upperBands).toBeUndefined() // There shouldn't be enough candles to calculate bbands yet.

  // The real test will be comparing against talib's calculations.
  const ma = 'ema', period = 9
  const indicatorSettings  = ta.id[ma](state.md2h, period)
  const r                  = talib.execute(indicatorSettings)
  const invertedMarketData = ta.invertedMarketData(state.md2h)
  ta.invertedAppend(invertedMarketData, 'ema9', r.result.outReal)
  //console.warn({ agg: state.imd2h.open.slice(0), md: state.md2h.open })
  //console.warn({ 'wasWrongButNotAnymore': state.imd2h.ema9, right: invertedMarketData.ema9 })
  expect(invertedMarketData.ema9).toEqual(state.imd2h.ema9)
})

/*

let state
baseTimeframe = '1h'
indicatorSpecs = { '2h': [ ['ema', 9] ] }
iterate = pipeline.mainLoopFn(baseTimeframe, indicatorSpecs)
candles.forEach((c) => state = iterate(c))

pipeline = reload('./pipeline'); state = undefined
iterate = pipeline.mainLoopFn(baseTimeframe, indicatorSpecs)
candles.forEach((c) => state = iterate(c))

ema = require('./indicators').ema
let md = ta.marketDataFromCandles([])
let imd = ta.invertedMarketData(md)
let [emaInsert, emaUpdate] = ema(9)
let state2
let minimumCandles = state.md2h.close.map((close) => [0, 0, 0, 0, close, 0])
minimumCandles.forEach((c) => {
md = ta.marketDataAppendCandle(md, c)
imd = ta.invertedAppendCandle(imd, c)
state2 = emaInsert(md, imd, state2)
if (state2) console.log('auxiliary', c[4])
})

*/

