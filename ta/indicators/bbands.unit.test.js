const talib = require('talib')
const ta = require('../index')
const bbands = require('./bbands')

let candles

function initializeCandles() {
  candles = require('../tests/fixtures/candles.json')
}

beforeEach(() => {
  initializeCandles()
})

test('BBANDS stream calculations should be consistent with BBANDS batch calculations', () => {
  // stream calculation
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const bbandsCalculator = bbands(20)
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    bbandsCalculator(md, imd)
  })

  // batch calculation copied and adapted from bin/price
  const marketData         = ta.marketDataFromCandles(candles)
  const indicatorSettings  = ta.id['bbands'](marketData, 20)
  const r                  = talib.execute(indicatorSettings)
  const invertedMarketData = ta.invertedMarketData(marketData)
  ta.invertedAppend(invertedMarketData, 'upperBand',  r.result.outRealUpperBand)
  ta.invertedAppend(invertedMarketData, 'middleBand', r.result.outRealMiddleBand)
  ta.invertedAppend(invertedMarketData, 'lowerBand',  r.result.outRealLowerBand)

  // batch and stream should have the same values
  // console.warn(invertedMarketData.bbands20, imd.bbands20)
  expect(invertedMarketData.upperBand).toEqual(imd.upperBand20)
  expect(invertedMarketData.middleBand).toEqual(imd.middleBand20)
  expect(invertedMarketData.lowerBand).toEqual(imd.lowerBand20)
})
