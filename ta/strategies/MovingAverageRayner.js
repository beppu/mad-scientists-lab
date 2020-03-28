/**
 * This is an implementation of the Moving Average-based strategy created by Rayner Teo.
 * https://www.tradingwithrayner.com/moving-average-indicator-trading-strategy/
 */

const clone = require('clone')
const analysis = require('../analysis')
const time = require('../time')

function testingAreaOfValue(marketBias, imd) {
  // if we're bullish, are we under the 20 ema (aka ma1)?
  // if we're bearish, are we over the 20 ema?
  // otherwise false

  // It doesn't seem to matter whether the 50 is breached or not, but if it gets that low, that might get you a good entry.
  // Not related to this function, but when the decision to make an entry is made,
  // I wonder if low timeframe divergences + a late entry criteria would work.
  // Hit a beautiful entry like a sniper.
}

const defaults = {
  tf: '2h',
  ma1: ['ema', 20],
  ma2: ['ema', 50],
  ma3: ['ema', 200],
  tests: 2, // number of tests into area of value before attempting to make an entry
}

module.exports = function init(baseTimeframe, config) {
  const merged = Object.assign({}, defaults, config)
  const indicatorSpecs = {}
  indicatorSpecs[merged.tf] = [
    merged.ma1,
    merged.ma2,
    merged.ma3
  ]
  const ma1Key = `${merged.ma1[0]}${merged.ma1[1]}`
  const ma2Key = `${merged.ma2[0]}${merged.ma2[1]}`
  const ma3Key = `${merged.ma3[0]}${merged.ma3[1]}`
  const initialState = {
    tf:           merged.tf,
    positionBias: undefined, // long, short, or undefined
    marketBias:   undefined, // bullish, bearish, or undefined
    testCount:    0          // How many times has price tested ma2?
  }
  const imdKey = `imd${merged.tf}`

  function strategy(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : initialState
    const imd = marketState[imdKey]
    const trendSeries = imd[ma3Key]
    const ts = time.iso(imd.timestamp[0])
    if (trendSeries) {
      const newMarketBias = analysis.bias.ma(imd.close, trendSeries)
      if (newMarketBias != state.marketBias) {
        console.log(`${ts} - marketBias = ${newMarketBias}`)
      }
      state.marketBias = newMarketBias
    }
    return [state, []]
  }

  return [indicatorSpecs, strategy]
}
