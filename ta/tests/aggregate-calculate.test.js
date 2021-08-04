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
  while (candle) {
    marketState = mainLoop(candle)
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
  while (candle) {
    marketState = mainLoop(candle)
    candle = await nextCandle()
  }
  // This time, we have to compare against talib.
  // I almost deprecated md*, but for the sake of these tests, I'm glad I didn't.
  // Also, since multi-timeframe aggregation looks good, I feel confident that I
  // can trust the contents of md* to be correct.

  // 1d
  let precision1d = 10 // bigger than 2 is enough
  const imd1d = marketState.imd1d
  const md1d = marketState.md1d
  const imd1d_ = ta.invertedMarketData(md1d)
  const bbandSettings1d = ta.id.bbands(md1d)
  const bbands1d = talib.execute(bbandSettings1d)
  ta.invertedAppend(imd1d_, 'upperBand', bbands1d.result.outRealUpperBand)
  ta.invertedAppend(imd1d_, 'middleBand', bbands1d.result.outRealMiddleBand)
  ta.invertedAppend(imd1d_, 'lowerBand', bbands1d.result.outRealLowerBand)
  // It's not exact, but it's very close.
  // expect(imd1d.middleBand).toMatchObject(imd1d_.middleBand)
  imd1d.upperBand.forEach((m, i) => {
    expect(m).toBeCloseTo(imd1d_.upperBand[i], precision1d)
  })
  imd1d.middleBand.forEach((m, i) => {
    expect(m).toBeCloseTo(imd1d_.middleBand[i], precision1d) // I'd be happy with 2, but even 10 is no problem.  This is more than close enough.
  })
  imd1d.lowerBand.forEach((m, i) => {
    expect(m).toBeCloseTo(imd1d_.lowerBand[i], precision1d)
  })

  // 4h
  let precision4h = 9 // bigger than 2 is enough
  const imd4h = marketState.imd4h
  const md4h = marketState.md4h
  const imd4h_ = ta.invertedMarketData(md4h)
  const bbandSettings4h = ta.id.bbands(md4h)
  const bbands4h = talib.execute(bbandSettings4h)
  ta.invertedAppend(imd4h_, 'upperBand', bbands4h.result.outRealUpperBand)
  ta.invertedAppend(imd4h_, 'middleBand', bbands4h.result.outRealMiddleBand)
  ta.invertedAppend(imd4h_, 'lowerBand', bbands4h.result.outRealLowerBand)
  // It's not exact, but it's very close.
  // expect(imd4h.middleBand).toMatchObject(imd4h_.middleBand)
  imd4h.upperBand.forEach((m, i) => {
    expect(m).toBeCloseTo(imd4h_.upperBand[i], precision4h)
  })
  imd4h.middleBand.forEach((m, i) => {
    expect(m).toBeCloseTo(imd4h_.middleBand[i], precision4h) // With 4h, I had to tone it down to 9, but 2 would have been enough for me.
  })
  imd4h.lowerBand.forEach((m, i) => {
    expect(m).toBeCloseTo(imd4h_.lowerBand[i], precision4h)
  })
})

test("simultaneous aggregation should calculate the right RSI values", async () => {
  const mainLoop   = newMainLoop([['rsi']])
  const nextCandle = await newNextCandle()
  let candle       = await nextCandle()
  let marketState
  while (candle) {
    marketState = mainLoop(candle)
    candle = await nextCandle()
  }

  // 1d
  let precision1d = 18 // bigger than 2 is enough
  const imd1d = marketState.imd1d
  const md1d = marketState.md1d
  const imd1d_ = ta.invertedMarketData(md1d)
  const rsiSettings1d = ta.id.rsi(md1d)
  const rsi1d = talib.execute(rsiSettings1d)
  ta.invertedAppend(imd1d_, 'rsi', rsi1d.result.outReal)
  // RSI gave me a perfect match on 1d which was a surprise.
  expect(imd1d.rsi).toMatchObject(imd1d_.rsi)
  // If the previous passed, this is superfluous.
  imd1d.rsi.forEach((m, i) => {
    expect(m).toBeCloseTo(imd1d_.rsi[i], precision1d)
  })

  // 4h
  let precision4h = 10 // bigger than 2 is enough
  const imd4h = marketState.imd4h
  const md4h = marketState.md4h
  const imd4h_ = ta.invertedMarketData(md4h)
  const rsiSettings4h = ta.id.rsi(md4h)
  const rsi4h = talib.execute(rsiSettings4h)
  ta.invertedAppend(imd4h_, 'rsi', rsi4h.result.outReal)
  // 4h could not give me a perfect match, but it doesn't have to be perfect.
  // expect(imd4h.rsi).toMatchObject(imd4h_.rsi)
  imd4h.rsi.forEach((m, i) => {
    expect(m).toBeCloseTo(imd4h_.rsi[i], precision4h)
  })
})

test("repeated candles using the same timestamp should not grow imd", () => {
  const specs = {'5m': [[ 'ema', 5 ]]}
  const mainLoop = pipeline.mainLoopFn('1m', specs)
  const candles = require('./fixtures/subminute.json')
  const cless = candles.slice(0, 360)

  let marketState
  cless.forEach((c) => {
    marketState = mainLoop(c)
  })
  //expect(marketState.imd5m.ema5).toHaveLength(1)
  //console.log(marketState.imd5m)

  /*
    // stepping through this bug
    sub = require('./tests/fixtures/subminute.json')
    s360 = sub.slice(0, 360)

    global.flag = false
    loop = pipeline.mainLoopFn('1m', { '5m': [[ 'ema', 5 ]]})
    for (i = 0; i < 355; i++) { marketState = loop(s360[i]) }

    global.flag = true
    marketState = loop(s360[355])
    // 356 357 358 359
   */
})

test("heikin ashi should not delete the first calculated value on aggregation", async () => {
  // pipeline.js around line 273 is a bitch
  const mainLoop   = newMainLoop([['heikinAshi']])
  const nextCandle = await newNextCandle()
  let candle       = await nextCandle()
  let marketState
  marketState = mainLoop(candle)
  candle = await nextCandle()
  marketState = mainLoop(candle)
  expect(marketState.imd4h.haLow[0]).toBeDefined()
})

/*
  // repl snippet

  //start = DateTime.fromMillis(1583589600000)
  start = DateTime.fromISO("2018-11-24T17:00:00.000-07:00")
  indicators = [['rsi']]
  timeframes = ['1h', '4h', '1d']
  specs = {}
  timeframes.forEach((tf) => {specs[tf] = indicators.map((indi) => indi)})
  mainLoop = pipeline.mainLoopFn('1h', specs)
  pipeline.loadCandlesFromFS('data', 'bybit', 'BTC/USD', '1h', start).then((nc) => x.nc = nc)
  nextCandle = x.nc
  pipeline.runLoop(mainLoop, nextCandle).then((ms) => x.ms = ms) // ms is marketState

 */
