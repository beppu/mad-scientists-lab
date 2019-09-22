const ccxt  = require('ccxt')
const talib = require('talib')
const luxon = require('luxon')

/**
 * Load candlestick data
 * @param {String} exchange  - Name of exchange
 * @param {String} market    - Symbol for market
 * @param {String} timeframe - Duration of candle (5m, 30m, 1h, 1d, etc)
 * @returns {Array<Object>}  - An array of candles
 */
async function loadCandles(exchange, market, timeframe) {
  console.log(exchange, ccxt[exchange])
  const ex = new ccxt[exchange]()
  const candles = await ex.fetchOHLCV(market, timeframe, undefined)
  return candles
}


/**
 * Transform candles from ccxt into marketData that talib can analyze.
 * @param {Array<Object>} candles    - An array of candles
 * @returns {Object<Array<Number>>}  - An object that has arrays for open, high, low, close and volume
 */
function marketDataFromCandles(candles) {
  const initial = { open: [], high: [], low: [], close: [], volume: [] }
  const marketData = candles.reduce(((m, a) => {
    m.timestamp.push(a[0])
    m.open.push(a[1])
    m.high.push(a[2])
    m.low.push(a[3])
    m.close.push(a[4])
    m.volume.push(a[5])
    return m
  }), initial)
  return marketData
}

/**
 * Invert marketData such that index 0 is the newest value rather than the oldest value
 * @param {Object<Array<Number>>} marketData  - An object that has arrays for open, high, low, close and volume
 * @returns {Object<Array<Number>>}           - marketData but inverted
 */
function invertedMarketData(marketData) {
  const inverted = {}
  Object.keys(marketData).forEach((key) => {
    invertedAppend(inverted, key, marketData[key])
  })
  return inverted
}

/**
 * Append an array of indicator values to an invertedMarketData such that the newest data will be at index 0
 * @param {Object<Array<Number>>} invertedMarketData  - An object that has arrays for open, high, low, close and volume
 * @param {String} key                                - Key name for series data to be appended to invertedMarketData
 * @param {Array<Number>} data                        - A series of numerical data with oldest info first and newest info last
 * @returns {Object<Array<Number>>}                   - invertedMarketData with series from `data` appended to it
 */
function invertedAppend(invertedMarketData, key, data) {
  invertedMarketData[key] = []
  const start = data.length - 1
  for (let i = start; i >= 0; i--) {
    invertedMarketData[key].push(data[i])
  }
  return invertedMarketData
}

// Go one candle back in time by removing index 0 non-destructively from invertedMarketData and return the result.
function _previous(imd) {
  const newImd = {}
  Object.keys(imd).forEach((k) => {
    const series = imd[k].slice(1)
    newImd[k] = series
  })
  return newImd
}

/**
 * Given a predicate `matchFn` iterate through `imd` starting from the present, index 0, and going back in time.
 * @param {Object}        imd      - invertedMarketData, an object with series data with newest data at index 0
 * @param {Function}      matchFn  - A function that can take invertedMarketData, analyze it, and return a boolean
 * @returns {Array<Object>}        - An array of indices in imd where fn is true
 */
function scan(imd, matchFn) {
  const results = []
  // find the length of the longest series in invertedMarketData
  const longest = Math.max(...Object.keys(imd).map((series) => imd[series].length))
  // starting from index 0 (the present) and going to the end of the longest series, apply fn to invertedMarketData
  // - on every iteration, remove index 0 from invertedMarketData to shrink it and go backward in time.
  //   series.slice(1) will do this immutably
  // - if fn returns true, append to results.
  let current = imd
  for (let i = 0; i < longest; i++) {
    if (matchFn(current)) {
      results.push(i)
    }
    current = _previous(current)
  }
  return results
}

// i for indicator
const id = {
  sma: function(marketData, period) {
    return {
      name:            'SMA',
      startIdx:        0,
      endIdx:          marketData.close.length - 1,
      inReal:          marketData.close,
      optInTimePeriod: period
    }
  },
  ema: function(marketData, period) {
    return {
      name:            'EMA',
      startIdx:        0,
      endIdx:          marketData.close.length - 1,
      inReal:          marketData.close,
      optInTimePeriod: period
    }
  }
}

module.exports = {
  loadCandles,
  marketDataFromCandles,
  invertedMarketData,
  invertedAppend,
  scan,
  id
};

/*
  // start repl
  $ bin/repl

  // in repl
  candles = await ta.loadCandles('binance', 'BTC/USDT', '5m')
  marketData = ta.marketDataFromCandles(candles)
  r = talib.execute(ta.id.sma(marketData, 200))

  // shape of result r
  {
    begIndex: 199,  // marketData.close[199] correlates to r.result.outReal[0]
    nbElement: 301, // b.result.outReal.length correlates to r.nbElement
    result: {
      outReal: []   // numbers from SMA
    }
  }

  // how to add the results of talib to invertedMarketData
  invertedMarketData = ta.invertedMarketData(marketData)
  ta.invertedAppend(invertedMarketData, 'sma200', r.result.outReal)

*/
