/*
 * The pipeline needs more testing.
 * It has to aggregate and calculate indicators in multiple timeframes at the same time.
 * Is it doing it right?
 * My initial investigation with research/Divergence* leads me to believe it's not.
 * I've tested a lot of things individually.
 * - candle consumption
 * - aggregation
 * - indicator calculation
 *
 * However, I haven't fully tested everything happening at once through the pipeline.
 * That's what this is for, and my immediate goal is to make divergence checking work.
 * That's why I'm testing:
 * - candle aggregation
 * - bband calculation
 * - rsi calculation
 *
 * That's from easiest to hardest.
 */

const talib = require('talib')
const ta = require('../index')
const pipeline = require('../pipeline')
const indicators = require('../indicators')
const time = require('../time')

function newNextCandle() {
  return pipeline.loadCandlesFromFS('tests', 'fixtures', 'BTC/USD', '1h')
}

function newMainLoop(indicators=[]) {
  const timeframes = ['1h', '4h', '1d']
  const specs = {}
  timeframes.forEach((tf) => {
    specs[tf] = indicators.map((indi) => indi)
  })
  return pipeline.mainLoopFn('1h', specs)
}

test("simultaneous aggregation in multiple timeframes should generate the right candles", async () => {
  // I want to pull in a bigger dataset for this test and the others I end up writing here.
  const mainLoop   = newMainLoop()
  const nextCandle = await newNextCandle()
  let candle       = await nextCandle()
  let marketState
  let i = 0
  while (candle) {
    marketState = mainLoop(candle)
    i++
    candle = await nextCandle()
  }
  const len1 = marketState.imd1h.timestamp.length
  console.log(i, marketState.imd1h.close[0], marketState.imd1h.close[len1 - 1], time.isTimeframeBoundary('1d', time.dt(marketState.imd1h.timestamp[len1 - 1])))
  //console.log(Object.keys(marketState), marketState.imd1h.close)
  expect(marketState.imd1h.close).toHaveLength(2400)
  expect(marketState.imd4h.close).toHaveLength(600)
  expect(marketState.imd1d.close).toHaveLength(100)
  // The numbers are currently off, but even after that I have to verify that their values are correct.
})

/*
test("simultaneous aggregation should calculate the right SMA values", () => {
  // I want to pull in a bigger dataset for this test and the others I end up writing here.
})
*/

test("simultaneous aggregation should calculate the right Bollinger Band values", async () => {
  const mainLoop   = newMainLoop([['bbands']])
  const nextCandle = await newNextCandle()
  let candle       = await nextCandle()
  let marketState
  let i = 0
  while (candle) {
    marketState = mainLoop(candle)
    i++
    candle = await nextCandle()
  }
})

test("simultaneous aggregation should calculate the right RSI values", async () => {
  const mainLoop   = newMainLoop([['rsi']])
  const nextCandle = await newNextCandle()
  let candle       = await nextCandle()
  let marketState
  let i = 0
  while (candle) {
    marketState = mainLoop(candle)
    i++
    candle = await nextCandle()
  }
})
