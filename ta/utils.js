const fs = require('fs')
const beautify = require('json-beautify')

function isAscending(comparables) {
  let rest = comparables.slice(1)
  let initial = { current: comparables[0], isAscending: true }
  let result = rest.reduce((m, a) => {
    if (m.isAscending == false) {
      return m
    }
    if (m.current > a) {
      m.isAscending = false
    }
    m.current = a
    return m
  }, initial)
  return result.isAscending
}

function isDescending(comparables) {
  let rest = comparables.slice(1)
  let initial = { current: comparables[0], isDescending: true }
  let result = rest.reduce((m, a) => {
    if (m.isDescending == false) {
      return m
    }
    if (m.current < a) {
      m.isDescending = false
    }
    m.current = a
    return m
  }, initial)
  return result.isDescending
}

/**
 * Trying to find lows by comparing lows to their proximity to the lower bband
 * @param {Number} threshold - % distance of low from lowerBand.
 * @returns {Function} A function that takes (imd, i) and returns a boolean
 */
function lowEnoughFn(threshold) {
  return function (imd, i) {
    //console.log({ low: imd.low[i], lband: imd.lowerBand[i], uband: imd.upperBand[i] })
    //console.log((imd.low[i] - imd.lowerBand[i]) / ( imd.upperBand[i] - imd.lowerBand[i]) * 100)
    const percentBLow = (imd.low[i] - imd.lowerBand[i]) / ( imd.upperBand[i] - imd.lowerBand[i]) * 100
    return percentBLow - threshold <= 0
  }
}

/**
 * Trying to find highs by comparing highs to their proximity to the upper bband
 * @param {Number} threshold - % distance of high from upperBand.
 * @returns {Function} A funciton that takes (imd, i) and returns a boolean
 */
function highEnoughFn(threshold) {
  return function (imd, i) {
    const percentBHigh = (imd.high[i] - imd.lowerBand[i]) / ( imd.upperBand[i] - imd.lowerBand[i]) * 100
    //console.log({percentBHigh, threshold, highEnough: percentBHigh + threshold > 100 })
    return percentBHigh + threshold >= 100
  }
}

/**
 * Return an array or array of indices of consecutive candles that satisfy the given function
 * @param {InvertedMarketData} imd - inverted market data
 * @param {Number} max - the maximum number of clusters to return
 * @param {Function} fn - a function that takes imd and an integer index and returns a boolean
 * @returns {Array<Array<Number>>} An array of array of indices that satisfy fn
 */
function findClusters(imd, max, fn) {
  let result = []
  let cluster = []
  for (let i = 0; i < imd.close.length; i++) {
    if (fn(imd, i)) {
      cluster.push(i)
    } else {
      if (cluster.length) {
        result.push(cluster)
        cluster = []
        if (result.length === max) {
          return result
        }
      }
    }
  }
  if (cluster.length) {
    result.push(cluster)
  }
  return result
}

/**
 * Out of the cluster, which index had the lowest close
 * @param {InvertedMarketData} imd - inverted market data
 * @param {Array<Number>} cluster - an array of indices
 */
function findLocalLow(imd, cluster) {
  const closes = cluster.map((i) => imd.close[i])
  const lowest = Math.min(...closes)
  const lowestIndex = closes.findIndex((c) => c == lowest)
  //console.log({ lowest, lowestIndex, clusterLowestIndex: cluster[lowestIndex], cluster })
  return cluster[lowestIndex]
}

/**
 * Out of the cluster, which index had the highest close
 * @param {InvertedMarketData} imd - inverted market data
 * @param {Array<Number>} cluster - an array of indices
 */
function findLocalHigh(imd, cluster) {
  const closes = cluster.map((i) => imd.close[i])
  const highest = Math.max(...closes)
  //console.log({closes, highest})
  const highestIndex = closes.findIndex((c) => c == highest)
  return cluster[highestIndex]
}

/**
 * Calculate profit and loss
 * @param {Number} quantity - How many contracts
 * @param {Number} entry - price the position was opened at
 * @param {Number} exit - price the position was closed at
 * @param {Number} leverage - how much leverage was used when opening the position
 * @param {Boolean} short - if true, this is for a short position instead of the default long position
 * @returns {Object} various stats on profit and loss of this position
 */
function profitLoss(quantity, entry, exit, leverage, short) {
  // XXX - This function works for XBTUSD, but what about other markets?
  const entryValue = quantity / entry
  const exitValue  = (exit / entry) * entryValue
  const profitLoss = short ? entryValue - exitValue : exitValue - entryValue
  const profitLossPercent = short ? (exitValue / entryValue * 100) : (entryValue / exitValue * 100)
  const roe = profitLossPercent * leverage
  return { entryValue, exitValue, profitLoss, profitLossPercent, roe }
}

/**
 * Calculate the fee for the trade
 * https://help.bybit.com/hc/en-us/articles/360039261154-Trading-fee-calculation
 * @param {Number} fee - percent * 0.01  (example: 0.075% => 0.00075)
 * @param {Number} quantity - number of contracts
 * @param {Number} price - price of asset at time of trade
 * @returns {Number} fee in BTC
 */
function tradingFee(fee, quantity, price) {
  return (quantity / price) * fee
}

/**
 * An array with 2 numbers in it representing the x and y coordinates of a point in a chart
 * @typedef {Array<Number>} Point
 */

/**
 * Calculate the slope between two points in linear space.
 * @param {Point} a - a point
 * @param {Point} b - another point
 * @returns {Number} The slope for the line connecting a and b in linear space
 */
function slope(a, b) { return (b[1] - a[1]) / (b[0] - a[0]) }

/**
 * Calculate the slope between two points in log-linear space.
 * @param {Point} a - a point
 * @param {Point} b - another point
 * @returns {Number} The slope for the line connecting a and b in log-linear space
 */
function log10Slope(a, b) {
  return Math.log10(b[1] / a[1]) / (b[0] - a[0])
}
// I don't know if I'll need this, but it might be handy later.

/**
 * Return a function for plotting a line in linear space as defined by the 2 points, a and b
 * @param {Point} a a point in the line
 * @param {Point} b another point in the line
 * @returns {Function} given x, return y in linear space
 */
function lineFn(a, b) {
  let m = slope(a, b)
  let offset = a[1] - (m * a[0])
  return function(x) {
    return (m * x) + offset
  }
}

/**
 * Return a function for plotting a line in log-linear space as defined by the 2 points, a and b
 * @param {Point} a a point in the line
 * @param {Point} b another point in the line
 * @returns {Function} given x, return y in log-linear space
 */
function log10LineFn(a, b) {
  // https://en.wikipedia.org/wiki/Semi-log_plot#log-linear_plot
  return function(x) {
    return (a[1] * 10 ** (((x - a[0]) / (b[0] - a[0]) * Math.log10(b[1]/a[1]))))
  }
}
// TODO Write bin/trendline
// My code tries to load 1000 candles by default, and this means big trendlines need big timeframes.

function hanneValue(imd, period) {
  // find the highest high
  // find the lowest low
}

/**
 * Return a predictable path for storing/retrieving OHLCV data
 * @param {String} dataDir - Directory reserved for data storage
 * @param {String} exchange - exchange name
 * @param {String} market - market symbol
 * @param {String} timeframe - duration of candle
 * @returns {String} Path where OHLCV JSON files are stored
 */
function dataPath(dataDir, exchange, market, timeframe) {
  let mkt = market.replace(/\W/g, '')
  return `${dataDir}/${exchange}/${mkt}/${timeframe}`
}

/**
 * Is a key missing from an object?
 * @param {Array<String>} keys - list of keys that are required
 * @param {Object} object - object that must contain keys
 * @returns {Boolean} true if any key is missing
 */
function missing(keys, object) {
  let miss = false
  keys.forEach((k) => {
    if (!object.hasOwnProperty(k)) miss = true
  })
  return miss
}

/**
 * Parse a string as a base 10 number
 * @param {String} n - string to parse as a number
 * @returns {Number} the parsed number
 */
function parseIntB10(n) {
  return parseInt(n, 10)
}

/**
 * Dump a JSON serializable data struct to a file
 * @param {Any} data - data to dump to a file
 * @param {String} filename - path to file
 */
function dump(data, filename) {
  fs.writeFileSync(filename, beautify(data, null, 2, 80))
}

// collect candles
/*

  const beautify = require('json-beautify')
  start = DateTime.fromISO('2017-01-01', { zone: 'utc' })
  pipeline.loadCandlesFromFS('data', 'bitmex', 'BTC/USD', '1h', start).then((it) => x.it = it)

  count = 2400
  utils._cc(x.it, start, count).then((cs) => x.cs = cs)

  fs.writeFileSync(`tests/fixtures/BTCUSD/1h/${x.cs[0][0]}.json`, beautify(x.cs, null, 2, 80))


  // snippet for the 1m fixtures that come in 2 sets of 10 candles
  start = DateTime.fromMillis(0)
  pipeline.loadCandlesFromFS('tests', 'fixtures', 'BTC/USD', '1m', start).then((nextCandle) => x.nextCandle = nextCandle)

  utils._cc(x.nextCandle, start, 30).then((cs) => x.cs2 = cs)

*/

async function _cc(it, start, count) {
  let ax = []
  let candle = await it()
  let n = 0
  let end = false
  while (candle && !end) {
    console.log(candle[0], start.toMillis(), candle[0] > start.toMillis())
    if (!candle[0]) return 'fuck'
    if (candle[0] >= start.toMillis()) {
      ax.push(candle)
      n++
    }
    if (n == count) {
      console.log('end!!')
      end = true
    }
    candle = await it()
  }
  return ax
}

module.exports = {
  isAscending,
  isDescending,
  lowEnoughFn,
  highEnoughFn,
  findClusters,
  findLocalLow,
  findLocalHigh,
  profitLoss,
  tradingFee,
  slope,
  log10Slope,
  lineFn,
  log10LineFn,
  dataPath,
  missing,
  parseIntB10,
  dump,
  _cc
}
