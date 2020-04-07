const ccxt  = require('ccxt')
const talib = require('talib')
const luxon = require('luxon')
const DateTime = luxon.DateTime
const cache = require('cache-all/file')
const xdg = require('xdg-basedir')
const pRetry = require('p-retry')
const clone = require('clone')
const reverse = require('lodash.reverse')
Promise = require('bluebird')

const time = require('./time')

cache.init({
  ttl: 50,
  isEnable: true,
  file: {
    path: `${xdg.data}/ta/cache/`
  }
})

/**
 * Load candlestick data
 * @param {String} exchange  - Name of exchange
 * @param {String} market    - Symbol for market
 * @param {String} timeframe - Duration of candle (5m, 30m, 1h, 1d, etc)
 * @returns {Array<Object>}  - An array of candles
 */
async function loadCandles(exchange, market, timeframe) {
  const ex = new ccxt[exchange]()
  const key = `${exchange}-${market}-${timeframe}`
  try {
    let candles = await cache.get(key)
    if (!candles) {
      let fetch = async () => {
        let _candles
        try {
          const limit = 1000
          const now = DateTime.local()
          const tf = time.timeframeToMinutes(timeframe)
          const since = now.minus({ minutes: tf * limit })
          _candles = await ex.fetchOHLCV(market, timeframe, since.toMillis(), limit)
        }
        catch (err) {
          throw new pRetry.AbortError(err)
        }
        return _candles
      };
      candles = await pRetry(fetch, { retries: 5 })
      await cache.set(key, candles)
    }
    return candles
  } catch(err) {
    console.error(err)
    return []
  }
}

/**
 * Transform candles from ccxt into marketData that talib can analyze.
 * @param {Array<Object>} candles    - An array of candles
 * @returns {Object<Array<Number>>}  - An object that has arrays for open, high, low, close and volume
 */
function marketDataFromCandles(candles) {
  const initial = { timestamp: [], open: [], high: [], low: [], close: [], volume: [] }
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
 * Append one candle to an existing marketData struct
 * @param {Object} candle - one candle
 * @param {MarketData} md - a MarketData structure
 * @returns {MarketData} a MarketData structure with one candle appended to it
 */
function marketDataAppendCandle(marketData, candle) {
  marketData.timestamp.push(candle[0])
  marketData.open.push(candle[1])
  marketData.high.push(candle[2])
  marketData.low.push(candle[3])
  marketData.close.push(candle[4])
  marketData.volume.push(candle[5])
  return marketData
}

function marketDataUpdateCandle(marketData, candle) {
  let last
  if (marketData.timestamp.length === 0) {
    // If update happens on an empty marketData, do an append first.
    return marketDataAppendCandle(marketData, candle)
  }
  last = marketData.timestamp.length - 1
  //marketData.timestamp[last] = candle.timestamp // should be same value so skip
  //marketData.open[last] = candle[1] // also skip, because open shouldn't change either.
  marketData.high[last] = candle[2]
  marketData.low[last] = candle[3]
  marketData.close[last] = candle[4]
  marketData.volume[last] = candle[5]
  return marketData
}

/**
 * Reduce marketData to its first n values
 * @param {MarketData} marketData - a MarketData structure
 * @param {Number} n - number of values desired
 * @returns {MarketData} a MarketData struct with n values per key
 */
function marketDataTake(marketData, n, wantAll) {
  const abbreviatedMarketData = {}
  if (wantAll) {
    abbreviatedMarketData.timestamp = marketData.timestamp.slice(0, n)
    abbreviatedMarketData.open      = marketData.open.slice(0, n)
    abbreviatedMarketData.high      = marketData.high.slice(0, n)
    abbreviatedMarketData.low       = marketData.low.slice(0, n)
    abbreviatedMarketData.close     = marketData.close.slice(0, n)
    abbreviatedMarketData.volume    = marketData.volume.slice(0, n)
  } else {
    abbreviatedMarketData.close = marketData.close.slice(0, n)
  }
  return abbreviatedMarketData
}

/**
 * Reduce marketData to its last n values
 * @param {MarketData} marketData - a MarketData structure
 * @param {Number} n - number of values desired
 * @returns {MarketData} a MarketData struct with n values per key
 */
function marketDataTakeLast(marketData, n, wantAll) {
  const abbreviatedMarketData = {}
  if (wantAll) {
    abbreviatedMarketData.timestamp = marketData.timestamp.slice(-n)
    abbreviatedMarketData.open      = marketData.open.slice(-n)
    abbreviatedMarketData.high      = marketData.high.slice(-n)
    abbreviatedMarketData.low       = marketData.low.slice(-n)
    abbreviatedMarketData.close     = marketData.close.slice(-n)
    abbreviatedMarketData.volume    = marketData.volume.slice(-n)
  } else {
    abbreviatedMarketData.close = marketData.close.slice(-n)
  }
  return abbreviatedMarketData
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
 * @returns {Object<Array<Number>>}                   invertedMarketData with series from `data` appended to it
 */
function invertedAppend(invertedMarketData, key, data) {
  invertedMarketData[key] = []
  const start = data.length - 1
  for (let i = start; i >= 0; i--) {
    invertedMarketData[key].push(data[i])
  }
  return invertedMarketData
}

/**
 * Append one candle to an invertedMarketData struct
 * @param {InvertedMarketData} invertedMarketData - an invertedMarketData struct
 * @param {Candle} candle                         - one new candle
 * @returns {InvertedMarketData} an updated invertedMarketData struct
 */
function invertedAppendCandle(invertedMarketData, candle) {
  invertedMarketData.timestamp.unshift(candle[0])
  invertedMarketData.open.unshift(candle[1])
  invertedMarketData.high.unshift(candle[2])
  invertedMarketData.low.unshift(candle[3])
  invertedMarketData.close.unshift(candle[4])
  invertedMarketData.volume.unshift(candle[5])
  return invertedMarketData
}

/**
 * Update the most recent candle in invertedMarketData
 * @param {InvertedMarketData} invertedMarketData - an invertedMarketData struct
 * @param {Candle} candle                         - one updated candle
 * @returns {InvertedMarketData} an updated invertedMarketData struct
 */
function invertedUpdateCandle(invertedMarketData, candle) {
  if (invertedMarketData.timestamp.length === 0) {
    return invertedAppendCandle(invertedMarketData, candle)
  }
  // leave timestamp and open alone
  invertedMarketData.high[0] = candle[2]
  invertedMarketData.low[0] = candle[3]
  invertedMarketData.close[0] = candle[4]
  invertedMarketData.volume[0] = candle[5]
  return invertedMarketData
}

/**
 * Return a list of candles based on the provided `indices`
 * @param {Object<Array<Number>>} imd - invertedMarketData
 * @param {Array<Number>} indices - A list of indices for series data within imd
 * @returns {Array<Array<Number>>} - An array of candles
 */
function invertedCandles(imd, indices) {
  return indices.reduce((m, a) => {
    m.unshift([
      imd.timestamp[a],
      imd.open[a],
      imd.high[a],
      imd.low[a],
      imd.close[a],
      imd.volume[a],
      DateTime.fromMillis(imd.timestamp[a]).toString()
    ])
    return m
  }, [])
}


/**
 * Go one candle back in time by removing the last index non-destructively from marketData and return the result
 * @param {MarketData} md - current market data
 * @returns {MarketData} previous market data
 */
function _previousMd(md) {
  const newMd = {}
  Object.keys(md).forEach((k) => {
    const series = md[k].slice(0, md[k].length - 1)
    newMd[k] = series
  })
  return newMd
}

// Go one candle back in time by removing index 0 non-destructively from invertedMarketData and return the result.
function _previousImd(imd) {
  const newImd = {}
  Object.keys(imd).forEach((k) => {
    const series = imd[k].slice(1)
    newImd[k] = series
  })
  return newImd
}

/**
 * Return an imd that's $candles candles in the past.
 * @param {Object<Array<Number>>} imd - Parameter description.
 * @param {Number} candles - Parameter description.
 * @returns {Object<Array<Number>>} Return description.
 */
function _goBack(imd, candles) {
  if (candles > 0) {
    return _goBack(_previousImd(imd), candles - 1)
  } else {
    return imd
  }
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
    let res = matchFn(current)
    if (res) {
      //console.warn(i, res, DateTime.fromMillis(current.timestamp[0]).toString())
      if (typeof res != 'boolean') {
        results.push(i + res.offset)
      } else {
        results.push(i)
      }
    }
    //if (results.length > 0) break
    current = _previousImd(current)
  }
  return results
}

// id is short for indicator
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
  },
  bbands: function(marketData, period=20) {
    return {
      name:            'BBANDS',
      startIdx:        0,
      endIdx:          marketData.close.length - 1,
      inReal:          marketData.close,
      optInTimePeriod: period,
      optInNbDevUp:    2,
      optInNbDevDn:    2,
      optInMAType:     0
    }
  },
  rsi: function(marketData, period=14) {
    return {
      name:            'RSI',
      startIdx:        0,
      endIdx:          marketData.close.length - 1,
      inReal:          marketData.close,
      optInTimePeriod: period
    }
  },
  atr: function(marketData, period=14) {
    const {high, low, close} = marketData
    return {
      name:            'ATR',
      startIdx:        0,
      endIdx:          marketData.close.length - 1,
      high,
      low,
      close,
      optInTimePeriod: period
    }
  }
}

/**
 * Compute the index into series and pad series with undefined if necessary.
 * @param {Array} series - underlying (non-inverted) array backing an InvertedSeries
 * @param {Number} index - desired index into the InvertedSeries
 * @returns {Number} corresponding index into the underlying Array
 */
function invertedIndexForSet(series, index) {
  let i
  if (series.length) {
    if (index >= series.length) {
      // pad the series first
      for (let j = series.length; j <= index; j++) {
        series.unshift(undefined)
      }
      i = 0
    } else {
      i = series.length - 1 - index
    }
  } else {
    if (index === 0) {
      i = 0
    } else if (index >= series.length) {
      // pad the series first
      for (let j = series.length; j <= index; j++) {
        series.unshift(undefined)
      }
      i = 0
    } else {
      i = series.length - 1 - index
    }
  }
  return i
}

function invertedIndexForGet(series, index) {
  let i
  if (series.length) {
    if (index >= series.length) {
      // DO NOT pad the series first
      i = -1 // anything undefined will do
    } else {
      i = series.length - 1 - index
    }
  } else {
    if (index === 0) {
      i = 0
    } else if (index >= series.length) {
      // DO NOT pad the series first
      i = -1
    } else {
      i = series.length - 1 - index
    }

  }
  return i
}

const invertedSeriesHandler = {
  get: function(target, key) {
    switch (key) {
    case 'unshift':
      return target.unshift.bind(target)
    case 'slice':
      return target.slice.bind(target)
    case 'push':
      return target.push.bind(target)
    case 'length':
      return target.series.length
    default:
      const i = invertedIndexForGet(target.series, key)
      return target.series[i]
    }
  },
  set: function(target, key, value) {
    const i = invertedIndexForSet(target.series, key)
    target.series[i] = value
    return value
  }
}

const invertedSeriesMethods = {
  // making this fast
  unshift: function(value) {
    // this speeds up the pipeline considerably
    return this.series.push(value)
  },
  // sacrificing a lot of speed here
  slice: function() {
    // this slows scan down but it's only batch ops that scan right now.
    return reverse(this.series).slice(...arguments)
  },
  // sacrificing speed here
  push: function(value) {
    // only the batch ops use this, and it'll be max 1000 candles, so no biggy.
    return this.series.unshift(value)
  }
}

function createInvertedSeries() {
  const target = Object.assign({ series: [] }, invertedSeriesMethods)
  return new Proxy(target, invertedSeriesHandler)
}

module.exports = {
  loadCandles,
  marketDataFromCandles,
  marketDataAppendCandle,
  marketDataUpdateCandle,
  marketDataTake,
  marketDataTakeLast,
  invertedMarketData,
  invertedAppend,
  invertedAppendCandle,
  invertedUpdateCandle,
  invertedCandles,
  scan,
  id,
  createInvertedSeries,
  _previousMd,
  _previousImd,
  _goBack
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

  // how to just if price is currently greater than SMA 200
  isPriceGtSMA200 = (imd) => imd.close[0] > imd.sma200[0]
  r2 = isPriceGtSMA200(invertedMarketData) // r2 is a boolean

  // how to scan invertedMarketData for all candles where price was greater than SMA 200
  r3 = ta.scan(invertedMarketData, isPriceGtSMA200) // r3 is a list of indices in invertedMarketData

*/
