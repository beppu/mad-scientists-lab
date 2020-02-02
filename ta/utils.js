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
    return 1 - (imd.lowerBand[i] / imd.low[i]) <= (threshold / 100)
  }
}

/**
 * Trying to find highs by comparing highs to their proximity to the upper bband
 * @param {Number} threshold - % distance of high from upperBand.
 * @returns {Function} A funciton that takes (imd, i) and returns a boolean
 */
function highEnoughFn(threshold) {
  return function (imd, i) {
    return 1 - (imd.high[i] / imd.upperBand[i]) <= (threshold / 100)
  }
}

/**
 * Return an array or array of indices of consecutive candles that satisfy the given function
 * @param {InvertedMarketData} imd - inverted market data
 * @param {Function} fn - a function that takes imd and an integer index and returns a boolean
 * @returns {Array<Array<Number>>} An array of array of indices that satisfy fn
 */
function findClusters(imd, fn) {
  let result = []
  let cluster = []
  for (let i = 0; i < imd.close.length; i++) {
    if (fn(imd, i)) {
      cluster.push(i)
    } else {
      if (cluster.length) {
        result.push(cluster)
        cluster = []
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
 * Return a function for plotting a line in log-linear space as defined by the 2 points, a and b
 * @param a {Point} a point in the line
 * @param b {Point} another point in the line
 * @returns {Function} given x, return y in log-linear space
 */
function log10LineFn(a, b) {
  return function(x) {
    return (a[1] * 10 ** (((x - a[0]) / (b[0] - a[0]) * Math.log10(b[1]/a[1]))))
  }
}
// TODO Write bin/trendline

module.exports = {
  isAscending,
  isDescending,
  lowEnoughFn,
  highEnoughFn,
  findClusters,
  findLocalLow,
  findLocalHigh,
  profitLoss,
  log10LineFn
}
