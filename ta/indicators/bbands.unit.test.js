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
  const [bbandsInsert, bbandsUpdate] = bbands(20)
  let state
  candles.forEach((c) => {
    ta.marketDataAppendCandle(md, c) // NOTE
    ta.invertedAppendCandle(imd, c)  // These mutate md and imd respectively, so let's not pretend otherwise.
    state = bbandsInsert(md, imd, state)
  })

  // batch calculation copied and adapted from bin/price
  const marketData         = ta.marketDataFromCandles(candles)
  const indicatorSettings  = ta.id.bbands(marketData, 20)
  const r                  = talib.execute(indicatorSettings)
  const invertedMarketData = ta.invertedMarketData(marketData)
  ta.invertedAppend(invertedMarketData, 'upperBand',  r.result.outRealUpperBand)
  ta.invertedAppend(invertedMarketData, 'middleBand', r.result.outRealMiddleBand)
  ta.invertedAppend(invertedMarketData, 'lowerBand',  r.result.outRealLowerBand)

  // batch and stream should have the same values
  // console.warn(invertedMarketData.bbands20, imd.bbands20)
  expect(invertedMarketData.upperBand).toEqual(imd.upperBand)
  expect(invertedMarketData.middleBand).toEqual(imd.middleBand)
  expect(invertedMarketData.lowerBand).toEqual(imd.lowerBand)
})
