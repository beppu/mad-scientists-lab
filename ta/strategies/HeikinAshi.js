/**
 * This strategy uses Guppy EMAs in confluence with RSI thresholds to make decisions.
 */

const clone = require('clone')
const analysis = require('../analysis')
const time = require('../time')

const defaultConfig = {
  trendTf: '4h',
  entryTf: '3m'
}

function configSlug(config) {
  return 'ha'
}

function haColor(imd, i=0) {
  return (imd.haOpen[i] < imd.haClose[i]) ? 'green' : 'red'
}

function init(customConfig) {
  const config = Object.assign({}, defaultConfig, customConfig)
  const logger = config.logger

  const indicatorSpecs = {}
  indicatorSpecs[config.trendTf] = [ ['heikinAshi'] ]
  indicatorSpecs[config.entryTf] = [ ['heikinAshi'], ['bbands'] ]

  // On timeframe boundaries, I should check if heikin ashi changed colors.

  function strategy(strategyState, marketState, executedOrders) {
    const state = strategyState || { done: {} }
    const orders = []
    const imdTrend = marketState[`imd${config.trendTf}`]
    const imdEntry = marketState[`imd${config.entryTf}`]
    const tf = config.trendTf
    if (time.isTimeframeBoundary(tf, time.dt(imdEntry.timestamp[0]))) {
      const ts    = time.iso(imdTrend.timestamp[1])
      if (!state.done[ts]) {
        const open  = imdTrend.haOpen[1]
        const high  = imdTrend.haHigh[1]
        const low   = imdTrend.haLow[1]
        const close = imdTrend.haClose[1]
        state.done[ts] = true
        console.warn({ ts, open, high, low, close, color: haColor(imdTrend, 1) })
      }
    }
    return [state, orders]
  }

  return [indicatorSpecs, strategy]
}

module.exports = {
  defaultConfig,
  configSlug,
  init
}
