const talib = require('talib')
const ta = require('../index')
const rsi = require('./rsi')

let candles

function initializeCandles() {
  candles = require('../tests/fixtures/candles.json')
}

beforeEach(() => {
  initializeCandles()
})

test('RSI stream calculations should be consistent with RSI batch calculations', () => {
  // stream calculation
  const period = 14
  const key = `rsi`
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  //const rsiCalculator = rsi(period)
  const [rsiCalculate, rsiRecalculate] = rsi(period)
  let state
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    state = rsiCalculate(md, imd, state)
  })

  // batch calculation copied and adapted from bin/price
  const marketData         = ta.marketDataFromCandles(candles)
  const indicatorSettings  = ta.id['rsi'](marketData, period)
  const r                  = talib.execute(indicatorSettings)
  const invertedMarketData = ta.invertedMarketData(marketData)
  ta.invertedAppend(invertedMarketData, key, r.result.outReal)

  // batch and stream should have the same values
  //console.warn(invertedMarketData[key], imd[key])
  expect(invertedMarketData[key]).toEqual(imd[key])
})
