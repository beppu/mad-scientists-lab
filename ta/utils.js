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
 * @param {Number} threshold - Distance from lowerBand.  Positive values allow prices to be higher than the lower band.
 * @returns {Function} A function that takes (imd, i) and returns a boolean
 */
function lowEnoughFn(threshold) {
  return function (imd, i) {
    return imd.low[i] - imd.lowerBand[i] <= threshold
  }
}

function highEnoughFn(threshold) {
  return function (imd, i) {
    return imd.high[i] - imd.upperBand[i] >= threshold // negative value means you don't have to touch the upper band
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

module.exports = {
  isAscending,
  isDescending,
  lowEnoughFn,
  highEnoughFn,
  findClusters,
  findLocalLow,
  findLocalHigh
}
