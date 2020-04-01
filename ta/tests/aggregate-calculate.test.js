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
  //console.log(i, marketState.imd1h.close[0], marketState.imd1h.close[len1 - 1], time.isTimeframeBoundary('1d', time.dt(marketState.imd1h.timestamp[len1 - 1])))
  //console.log(Object.keys(marketState), marketState.imd1h.close)
  expect(marketState.imd1h.close).toHaveLength(2400)
  expect(marketState.imd4h.close).toHaveLength(600)
  expect(marketState.imd1d.close).toHaveLength(100)
  // The numbers are currently off, but even after that I have to verify that their values are correct.
  // Spot checking this against TradingView looks very close.
  // It's only different, because BitMEX seems to have allowed incrments that were less than $0.50 back in 2017.
  // The raw data of the 1h candles shows fractional prices that do not end in .00 or .50.
  // let {open, high, low, close} = marketState.imd1d
  // console.log(open[99], high[99], low[99], close[99]) // On TradingView, it's rounded to the nearest 0.50.
  // console.log(open[98], high[98], low[98], close[98]) // Spot checked 2017-01-02's 1d candle on TradingView and it's close and rounded again.
  // tests for 1d boundary
  const md1h = marketState.md1h
  const imd1d = marketState.imd1d
  expect(imd1d.open[99]).toBe(md1h.open[0])
  expect(imd1d.high[99]).toBe(Math.max(...md1h.high.slice(0, 24)))
  expect(imd1d.low[99]).toBe(Math.min(...md1h.low.slice(0, 24)))
  expect(imd1d.close[99]).toBe(md1h.close[23])
  // If 1h -> 1d works, 1h -> 4h probably works too.
  // Let's verify that though.
  const md4h = marketState.md4h
  const imd4h = marketState.imd4h
  expect(imd4h.open[599]).toBe(md1h.open[0])
  expect(imd4h.high[599]).toBe(Math.max(...md1h.high.slice(0, 4)))
  expect(imd4h.low[599]).toBe(Math.min(...md1h.low.slice(0, 4)))
  expect(imd4h.close[599]).toBe(md1h.close[3])
  // I'm satisfied.  The timeframe boundary borders look like they're being respected
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
  // This time, we have to compare against talib.  I almost deprecated md*, but for the sake of these tests, I'm glad I didn't.
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
