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
  expect(md.timestamp).toHaveLength(1)
  expect(md.open).toHaveLength(1)
  expect(md.high).toHaveLength(1)
  expect(md.low).toHaveLength(1)
  expect(md.close).toHaveLength(1)
  expect(md.volume).toHaveLength(1)
})

test('ta.invertedUpdateCandle should insert a value when called against an empty invertedMarketData struct', () => {
  const imd = ta.marketDataFromCandles([]) // in their empty state, md and imd are the same
  ta.invertedUpdateCandle(imd, candles[0])
  expect(imd.timestamp).toHaveLength(1)
  expect(imd.open).toHaveLength(1)
  expect(imd.high).toHaveLength(1)
  expect(imd.low).toHaveLength(1)
  expect(imd.close).toHaveLength(1)
  expect(imd.volume).toHaveLength(1)
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

test('an InvertedSeries should behave like an Array', () => {
  // It only implements a small subset of Array functionality, but it's the subset the pipeline needs.
  // The InvertedSeries makes unshift efficient by sacrificing push and slice which become very inefficient.
  // However, the pipeline is agonizingly slow without a fast unshift, so it's worth it.
  const arr = []
  const ins = ta.createInvertedSeries()
  expect(arr.length).toEqual(ins.length)
  arr.unshift(66)
  ins.unshift(66)
  expect(arr.length).toEqual(ins.length)
  arr.unshift(55)
  ins.unshift(55)
  expect(arr[0]).toEqual(ins[0])
  expect(arr.slice(1)).toEqual(ins.slice(1))
  arr.push(77)
  ins.push(77)
  expect(arr[2]).toEqual(ins[2])
  expect(arr[2]).toBe(77)
  expect(ins[2]).toBe(77)
  // So far, so good.  What could be going wrong in the pipeline?
  // ANSWER:  I forgot to implement InvertedSeries.set
  arr[3] = 9
  ins[3] = 9
  expect(arr[3]).toEqual(ins[3])
  expect(arr[3]).toBe(9)
  expect(ins[3]).toBe(9)
  // I need more tests for some newly discovered edge cases (on April Fool's 2020 no less).
  // setting index 0 on an empty series should yield a series where index 0 is vivified with the given value.
  const b = []
  const ins2 = ta.createInvertedSeries()
  b[0] = 5
  ins2[0] = 5
  expect(b[0]).toBe(ins2[0])
  // setting an out-of-bounds index should pad the internal series with undefined
  const c = []
  const ins3 = ta.createInvertedSeries()
  c[5] = 5
  ins3[5] = 5
  expect(c[5]).toBe(ins3[5])
  expect(c[3]).toBe(ins3[3])
  expect(c[3]).toBeUndefined()
  expect(c.length).toBe(ins3.length)
})

test('an InvertedSeries should be able to discard old data', () => {
  const s = ta.createInvertedSeries()
  for (let i = 1; i <= 6; i++) { s.unshift(i) }
  expect(s.length).toBe(6)
  const deleted = s.keep(2)
  expect(deleted).toBe(4)
  expect(s.length).toBe(2)
  expect(s[0]).toBe(6)
})

test('an InvertedSeries should be able to automatically discards old data on unshift when thresholds are reached', () => {
  // Note that threshold are optional.
  const s = ta.createInvertedSeries(1, 3)
  for (let i = 1; i <= 3; i++) { s.unshift(i) }
  expect(s[0]).toBe(3)
  expect(s.length).toBe(3)
  s.unshift(4)
  expect(s[0]).toBe(4)
  expect(s.length).toBe(1)
  s.unshift(5)
  expect(s[0]).toBe(5)
  expect(s[1]).toBe(4)
  expect(s.length).toBe(2)
})
