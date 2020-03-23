const ta = require('./index')

let candles

function initializeCandles() {
  candles = require('./tests/fixtures/candles.json')
}

beforeEach(() => {
  initializeCandles()
})

test('ta.marketDataFromCandles should be able to accept an empty array', () => {
  const initialEmptyState = { timestamp: [], open: [], high: [], low: [], close: [], volume: [] }
  expect(ta.marketDataFromCandles([])).toEqual(initialEmptyState)
})

test('ta.marketDataFromCandles should not lose data when doing its transform', () => {
  const md = ta.marketDataFromCandles(candles)
  expect(md.close.length).toEqual(candles.length)
})

test('ta.marketDataTake should return the right data', () => {
  const md = ta.marketDataFromCandles(candles)
  const md2 = ta.marketDataTake(md, 5)
  expect(md2.close[0]).toEqual(candles[0][4])
  expect(md2.close[4]).toEqual(candles[4][4])
})

test('ta.marketDataTakeLast should be allowed to ask for more than what is available', () => {
  const md = ta.marketDataFromCandles(candles)
  const mdTooMuch = ta.marketDataTakeLast(md, candles.length * 2)
  expect(mdTooMuch.close).toEqual(md.close)
})

test('ta.marketDataUpdateCandle should insert a value when called against an empty marketData struct', () => {
  const md = ta.marketDataFromCandles([])
  ta.marketDataUpdateCandle(md, candles[0])
  expect(md.close).toHaveLength(1)
})

test('ta.invertedUpdateCandle should insert a value when called against an empty invertedMarketData struct', () => {
  const imd = ta.marketDataFromCandles([]) // in their empty state, md and imd are the same
  ta.invertedUpdateCandle(imd, candles[0])
  expect(imd.close).toHaveLength(1)
})

test('ta.invertedUpdateCandle should not increase the length of a non-empty invertedMarketData', () => {
  const md = ta.marketDataFromCandles(candles)
  const imd = ta.invertedMarketData(md)
  const previousLength = imd.close.length
  ta.invertedUpdateCandle(imd, [0, 0, 0, 0, 0, 0])
  expect(imd.close).toHaveLength(previousLength)
})

test('ta.invertedUpdateCandle should not touch timestamp or open', () => {
  const md = ta.marketDataFromCandles(candles)
  const imd = ta.invertedMarketData(md)
  const timestamp = imd.timestamp[0]
  const open = imd.open[0]
  // REMEMBER: An update is NOT an aggregation.  It's more like a replacement.
  ta.invertedUpdateCandle(imd, [0, 0, 0, 0, 0, 0])
  expect(imd.timestamp[0]).toEqual(timestamp)
  expect(imd.open[0]).toEqual(open)
})
