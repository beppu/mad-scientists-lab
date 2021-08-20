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
  expect(imd.hma55[1]).toBeCloseTo(47105.3, 1)
  expect(imd.hma55[2]).toBeCloseTo(46661.2, 1)
  expect(imd.hma55[3]).toBeCloseTo(46109.8, 1)
  expect(imd.hma55[4]).toBeCloseTo(45444.1, 1)
  expect(imd.hma55[5]).toBeCloseTo(44697.4, 1)
  expect(imd.hma55[6]).toBeCloseTo(43914.2, 1)
})
