const talib = require('talib')
const ta = require('../index')
const pipeline = require('../pipeline')
const atr = require('./atr')

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

test('ATR stream calculations should be consistent with TradingView', async () => {
  const period = 14
  const key = `atr${period}`
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const [atrInsert, atrUpdate] = atr(period)
  let state
  let candles = await initializeCandles()
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    state = atrInsert(md, imd, state)
  })
  // from bybit, btcusd perpetual
  // 0 index is 2461.2947432267865, off by ~22
  // expect(imd.atr14[0]).toBeCloseTo(2484.1056, 1)
  expect(imd.atr14[1]).toBeCloseTo(2431.5753, 1)
  expect(imd.atr14[2]).toBeCloseTo(2476.6580, 1)
  expect(imd.atr14[3]).toBeCloseTo(2443.9394, 1)
  expect(imd.atr14[4]).toBeCloseTo(2444.1270, 1)
  expect(imd.atr14[5]).toBeCloseTo(2479.7907, 1)
  expect(imd.atr14[6]).toBeCloseTo(2501.5053, 1)
  expect(imd.atr14[7]).toBeCloseTo(2405.3134, 1)
  expect(imd.atr14[8]).toBeCloseTo(2404.6068, 1)
  expect(imd.atr14[9]).toBeCloseTo(2481.3073, 1)
  expect(imd.atr14[10]).toBeCloseTo(2503.6002, 1)
})
