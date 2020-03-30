/**
 * This is an implementation of the Moving Average-based strategy created by Rayner Teo.
 * https://www.tradingwithrayner.com/moving-average-indicator-trading-strategy/
 */

const clone = require('clone')
const analysis = require('../analysis')
const time = require('../time')

/**
 * Create a function that runs a predicate and updates state accordingly.
 * @param {String} key - key of state variable in `startegyState`
 * @param {Function} predicateFn - a function that takes no parameters and tests a condition.  (The data it needs must be closed over.)
 * @param {Function} onEntry - (optional) when the predicate changes to true, run the onEntry function.  Its signature should be (strategyState) -> strategyState
 * @param {Function} onExit - (optional) when the predicate changes to false, run the onExit function.  Its signature should be (strategyState) -> strategyState
 * @returns {Function} A function that tests preciate and has the signature: (strategyState, marketState) -> strategyState
 */
function testingFn(key, predicateFn, onEntry, onExit) {
  return function test(strategyState, marketState) {
    let newStrategyState = clone(strategyState)
    if (predicateFn()) {
      if (!newStrategyState[key]) {
        newStrategyState[key] = true
        if (onEntry) {
          newStrategyState = onEntry(newStrategyState, marketState)
        }
      }
    } else {
      if (newStrategyState[key]) {
        newStrategyState[key] = false
        if (onExit) {
          newStrategyState = onExit(newStrategyState, marketState)
        }
      }
    }
    return newStrategyState
  }
}

/**
 * Is the area of value being tested now?
 * @param {Type of marketBias} marketBias - Parameter description.
 * @param {Type of maSeries} maSeries - Parameter description.
 * @param {Type of priceSeries} priceSeries - Parameter description.
 * @returns {Return Type} Return description.
 */
function testingAreaOfValue(marketBias, maSeries, priceSeries) {
  // if we're bullish, are we under the 20 ema (aka ma1)?
  // if we're bearish, are we over the 20 ema?
  // otherwise false
  let isTesting
  switch(marketBias) {
  case 'bullish':
    isTesting = maSeries[0] > priceSeries[0]
    break;
  case 'bearish':
    isTesting = priceSeries[0] > maSeries[0]
    break;
  default:
    isTesting = undefined
  }
  return isTesting
  // It doesn't seem to matter whether the 50 is breached or not, but if it gets that low, that might get you a good entry.
  // Not related to this function, but when the decision to make an entry is made,
  // I wonder if low timeframe divergences + a late entry criteria would work.
  // Hit a beautiful entry like a sniper.
}

function trailStop(strategyState, priceSeries, maSeries) {
  //
  let id, modifier, update
  switch (strategyState.positionBias) {
  case 'long':
    id = 'long-stop'
    modifier = 5
    if (priceSeries[0] + modifier > maSeries[0]) {
      update = {
        id,
        type: 'modify',
        action: 'update',
        price: maSeries[0]
      }
    }
    break;
  case 'short':
    id = 'short-stop'
    modifier = -5
    if (priceSeries[0] + modifier < maSeries[0]) {
      update = {
        id,
        type: 'modify',
        action: 'update',
        price: maSeries[0]
      }
    }
    update = undefined // XXX - shorts seem to work better without a trailing stop in this strategy.
  }
  return update
}

const defaults = {
  tf: '2h',
  ma1: ['ema', 20],
  ma2: ['ema', 50],
  ma3: ['ema', 200],
  testsBeforeEntry: 1, // number of tests into area of value before attempting to make an entry
}

module.exports = function init(baseTimeframe, custom) {
  const config = Object.assign({}, defaults, custom)
  const indicatorSpecs = {}
  indicatorSpecs[config.tf] = [
    config.ma1,
    config.ma2,
    config.ma3
  ]
  const ma1Key = `${config.ma1[0]}${config.ma1[1]}`
  const ma2Key = `${config.ma2[0]}${config.ma2[1]}`
  const ma3Key = `${config.ma3[0]}${config.ma3[1]}`
  const initialState = {
    tf:            config.tf,
    positionBias:  undefined, // long, short, or undefined
    positionPrice: undefined, // fill price of position (more sophisticaion needed in future)
    stopPrice:     undefined, // price where stop loss is triggered
    marketBias:    undefined, // bullish, bearish, or undefined
    testing:       undefined, // is an area of value currently being tested?
    testCount:     0          // How many times has price tested the area of value?
  }
  const imdKey = `imd${config.tf}`

  function strategy(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : initialState
    const imd = marketState[imdKey]
    const trendSeries = imd[ma3Key]
    const ts = time.iso(imd.timestamp[0])
    const orders = []

    // handle executedOrders
    if (executedOrders && executedOrders.length) {
      // Order management could use some abstraction of its own.
      // What if orders get rejected?
      executedOrders.forEach((o) => {
        if (o.id === 'long' && o.status === 'filled') {
          state.positionBias = 'long'
          state.positionPrice = o.fillPrice
        }
        if (o.id === 'short' && o.status === 'filled') {
          state.positionBias = 'short'
          state.positionPrice = o.fillPrice
        }
        if (o.id === 'long-stop' && o.status === 'filled') {
          state.positionBias = undefined
        }
        if (o.id === 'short-stop' && o.status === 'filled') {
          state.positionBias = undefined
        }
        if (o.id === 'long-stop' && o.status === 'updated') {
          state.stopPrice = o.price
        }
        if (o.id === 'short-stop' && o.status === 'updated') {
          state.stopPrice = o.price
        }
      })
    }

    // adjust stops
    if (state.positionBias) {
      const adjustStop = trailStop(state, imd.close, imd[ma2Key])
      if (adjustStop) orders.push(adjustStop)
    }

    if (trendSeries) {
      const newMarketBias = analysis.bias.ma(imd.close, trendSeries)
      if (newMarketBias != state.marketBias) {
        // When the bias changes, state must be reset.
        console.log(`${ts} - marketBias = ${newMarketBias}`)
        state.testing   = undefined
        state.testCount = 0
      }

      state.marketBias = newMarketBias // it could be undefined, so that's why we check again in the next line.
      if (state.marketBias) {
        const predicate = () => {
          return testingAreaOfValue(state.marketBias, imd[ma1Key], imd.close)
        }
        const size = 8
        const stopBuffer = 50
        const onEntry = (strategyState) => {
          console.log('onEntry', `${strategyState.testCount} == ${config.testsBeforeEntry}`)
          if (strategyState.testCount == config.testsBeforeEntry) {
            switch (strategyState.marketBias) {
            case 'bullish':
              orders.push({
                id: 'long',
                type: 'market',
                action: 'buy',
                quantity: size
              })
              orders.push({
                id: 'long-stop',
                type: 'stop-market',
                action: 'sell',
                price: imd.close[0] - stopBuffer,
                quantity: size
              })
              break;
            case 'bearish':
              orders.push({
                id: 'short',
                type: 'market',
                action: 'sell',
                quantity: size
              })
              orders.push({
                id: 'short-stop',
                type: 'stop-market',
                action: 'buy',
                price: imd.close[0] + stopBuffer,
                quantity: size
              })
              break;
            }
          }
          return strategyState
        }
        const onExit = (strategyState) => {
          console.log('onExit')
          strategyState.testCount++
          return strategyState
        }

        const t = testingFn('testing', predicate, onEntry, onExit)
        state = t(state, marketState)
      }
    }
    return [state, orders]
  }

  return [indicatorSpecs, strategy]
}
