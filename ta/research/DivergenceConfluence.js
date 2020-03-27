/**
 * This strategy is only for debugging.
 * I might not even check it in.
 */

const analysis = require('../analysis')
const time = require('../time')

const divergenceOptions = {
  ageThreshold: 1,
  gapThreshold: [7, 30],
  peakThreshold: 9,
}

function bullFn(tf) {
  const imdKey = `imd${tf}`
  return function(marketState) {
    const imd = marketState[imdKey]
    return analysis.divergence.regularBullish(imd, divergenceOptions)
  }
}

function bearFn(tf) {
  const imdKey = `imd${tf}`
  return function(marketState) {
    const imd = marketState[imdKey]
    return analysis.divergence.regularBullish(imd, divergenceOptions)
  }
}

/**
 * This is a reduce function that returns the index of all items that are confluent.
 * @param {Array} r   - reduce accumulator
 * @param {Boolean} v - true if confluent
 * @param {Number} k  - index in original array
 */
function confluence(r, v, k) {
  if (v) r.push(k)
  return r
}

module.exports = function init(baseTimeframe, config) {
  const { logger, balance } = config

  // override divergenceOptions
  if (config.ageThreshold)  divergenceOptions.ageThreshold  = config.ageThreshold
  if (config.gapThreshold)  divergenceOptions.gapThreshold  = config.gapThreshold
  if (config.peakThreshold) divergenceOptions.peakThreshold = config.peakThreshold

  // How about a strategy for confluence analysis?
  const timeframesConfluence = [
    '1h', '2h', '3h',  '4h',
    '6h', '8h', '12h', '1d'
  ]
  // generate a list of analysis functions for the timeframes we care about
  const bulls = timeframesConfluence.map((tf) => bullFn(tf))
  const bears = timeframesConfluence.map((tf) => bearFn(tf))
  // dynamically build indicatorSpecs
  const iSpecsConfluence = timeframesConfluence.reduce((m, a) => {
    m[a] = [ ['rsi'], ['bbands'] ]
    return m
  }, {})
  function strategyConfluence(strategyState, marketState, executedOrders) {
    const bullStates = bulls.map((fn) => fn(marketState))
    const bearStates = bears.map((fn) => fn(marketState))
    const bullConfluences = bullStates.reduce(confluence, [])
    const bearConfluences = bearStates.reduce(confluence, [])
    if (bullConfluences.length > 1) {
      const lowestTf = timeframesConfluence[bullConfluences[0]]
      const imdKey = `imd${lowestTf}`
      const imd = marketState[imdKey]
      const ts = time.iso(imd.timestamp[0])
      const tfs = bullConfluences.map((i) => timeframesConfluence[i]).join(' + ')
      const message = `${ts} - ${tfs} bullish divergence confluence`
      console.log(message)
    }
    /*
    // Let's do bears later.
    if (bearConfluences.length > 1) {
    }
    */

    // This is a stateless strategy, so it doesn't matter what we return for strategyState.
    // It only exists to do analysis and print its findings as a side effect.
    return [strategyState, []]
  }

  return [iSpecsConfluence, strategyConfluence]
}
