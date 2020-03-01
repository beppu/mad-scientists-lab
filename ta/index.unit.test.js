const ta = require('./index')

let candles

function initializeCandles() {
  candles = [
  ]
}

beforeEach(() => {
  initializeCandles()
})

test('ta.marketDataFromCandles should be able to accept an empty array', () => {
  const initialEmptyState = { timestamp: [], open: [], high: [], low: [], close: [], volume: [] }
  expect(ta.marketDataFromCandles([])).toEqual(initialEmptyState)
})
