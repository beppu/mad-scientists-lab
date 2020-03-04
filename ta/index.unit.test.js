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
