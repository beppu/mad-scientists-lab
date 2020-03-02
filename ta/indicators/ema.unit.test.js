const talib = require('talib')
const ta = require('../index')
const ema = require('./ema')

let candles

function initializeCandles() {
  candles = require('../tests/fixtures/candles.json')
}

beforeEach(() => {
  initializeCandles()
})

test('EMA stream calculations should be consistent with EMA batch calculations', () => {
  const period = 5
  const key = `ema${period}`

  // stream calculation
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const emaCalculator = ema(period)
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    emaCalculator(md, imd)
  })

  // batch calculation copied and adapted from bin/price
  const marketData         = ta.marketDataFromCandles(candles)
  const indicatorSettings  = ta.id['ema'](marketData, period)
  const r                  = talib.execute(indicatorSettings)
  const invertedMarketData = ta.invertedMarketData(marketData)
  ta.invertedAppend(invertedMarketData, key, r.result.outReal)

  // batch and stream should have the same values
  // console.warn(invertedMarketData.emaperiod, imd.emaperiod)
  expect(invertedMarketData[key]).toEqual(imd[key])
})
