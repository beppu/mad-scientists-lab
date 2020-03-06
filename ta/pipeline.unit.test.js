const {DateTime} = require('luxon')
const pipeline = require('./pipeline')
const ta = require('./index')

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
  let state
  const s = pipeline.mainLoopFn('1h', {  })
})
