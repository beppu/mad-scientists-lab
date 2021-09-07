const talib = require('talib')
const ta = require('../index')
const obv = require('./obv')

let candles

function initializeCandles() {
  candles = require('../tests/fixtures/candles.json')
}

beforeEach(() => {
  initializeCandles()
})

test('OBV stream calculations should be consistent with OBV batch calculations', () => {
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const [obvInsert, obvUpdate] = obv(0) // FIXME OBV doesn't have a period.  It just accumulates from wherever it starts.
  let state
  candles.forEach((c) => {
    ta.marketDataAppendCandle(md, c)
    ta.invertedAppendCandle(imd, c)
    state = obvInsert(md, imd, state)
  })

  // batch calculation using talib
  const marketData         = ta.marketDataFromCandles(candles)
  const indicatorSettings  = ta.id.obv(marketData)
  const r                  = talib.execute(indicatorSettings)
  const invertedMarketData = ta.invertedMarketData(marketData)
  ta.invertedAppend(invertedMarketData, 'obv', r.result.outReal)

  // stream and batch should have the same value
  expect(imd.obv0).toEqual(invertedMarketData.obv)
})
