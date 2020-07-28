const talib = require('talib')
const ta = require('../index')
const sma = require('./sma')

let candles

function initializeCandles() {
  candles = require('../tests/fixtures/candles.json')
}

beforeEach(() => {
  initializeCandles()
})

test('An SMA value should not be calculated if the number of candles is insufficent', () => {
  const md = ta.marketDataFromCandles(candles)
  const md2 = ta.marketDataTake(md, 19)
  let imd2 = ta.invertedMarketData(md2)
  const [smaInsert, smaUpdate] = sma(20)
  smaInsert(md2, imd2)
  expect(imd2.sma20).toBeUndefined()
})

test('An SMA value should be calculated if the number of candles is sufficent', () => {
  let wantAll = true
  const md = ta.marketDataFromCandles(candles)
  const md2 = ta.marketDataTake(md, 20, wantAll)
  let imd2 = ta.invertedMarketData(md2)
  const [smaInsert, smaUpdate] = sma(20)
  smaInsert(md2, imd2)
  expect(imd2.sma20).toBeDefined()
})

test('SMA values should be appended as new candles arrive', () => {
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const [smaInsert, smaUpdate] = sma(20)
  let state
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    state = smaInsert(md, imd, state)
  })
  // 20 to 25 inclusive which should be 6 values
  const correctSMALength = candles.length - 20 + 1
  const lastIndex = candles.length - 1
  expect(imd.sma20).toHaveLength(correctSMALength)
  // extra testing for ta.*AppendCandle
  expect(md.close.length).toEqual(imd.close.length)
  expect(md.close[lastIndex]).toEqual(imd.close[0])
  expect(md.close[lastIndex-1]).toEqual(imd.close[1])
})

test('SMA stream calculations should be consistent with SMA batch calculations', () => {
  // stream calculation
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const [smaInsert, smaUpdate] = sma(20)
  let state
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    state = smaInsert(md, imd, state)
  })

  // batch calculation copied and adapted from bin/price
  const marketData         = ta.marketDataFromCandles(candles)
  const indicatorSettings  = ta.id['sma'](marketData, 20)
  const r                  = talib.execute(indicatorSettings)
  const invertedMarketData = ta.invertedMarketData(marketData)
  ta.invertedAppend(invertedMarketData, 'sma20', r.result.outReal)

  // batch and stream should have the same values
  expect(invertedMarketData.sma20).toEqual(imd.sma20)
})
