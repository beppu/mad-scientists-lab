const talib = require('talib')
const ta = require('../index')
const pipeline = require('../pipeline')
const hma = require('./hma')

/**
 * Return a candle iterator for BTC/USD 1d data from bybit
 */
async function newNextCandle() {
  return pipeline.loadCandlesFromFS('tests', 'fixtures', 'BTC/USD', '1d')
}

async function initializeCandles() {
  const nextCandle = await newNextCandle()
  let candles = []
  let candle = await nextCandle()
  while (candle) {
    candles.push(candle)
    candle = await nextCandle()
  }
  return candles
}

test('HMA stream calculations should be consistent with TradingView', async () => {
  const period = 55
  const key = `hma${period}`
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const [hmaInsert, hmaUpdate] = hma(period)
  let state
  let candles = await initializeCandles()
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    state = hmaInsert(md, imd, state)
  })
  expect(imd.hma55[1]).toBeCloseTo(47127.15, 2)
  expect(imd.hma55[2]).toBeCloseTo(46682.54, 2)
  expect(imd.hma55[3]).toBeCloseTo(46130.65, 2)
})
