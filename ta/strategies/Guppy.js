/**
 * This strategy uses Guppy EMAs in confluence with RSI thresholds to make decisions.
 */

const clone = require('clone')
const analysis = require('../analysis')

const defaultConfig = {
  guppyTf:      '15m',   // timeframe to use for guppy color changes.
  rsiTf:        '4h',    // timeframe to use for RSI crosses
  rsiThreshold: 2,       // distance from RSI 50 required for confluence.  Higher numbers are more aggressive and cause buying/selling to happen sooner.
  fixedPositionSize: 2,  // If we're using fixed position sizing, how many units should a position be?
}

function shouldBuy(marketState, config) {
  const logger   = config.logger
  const guppyImd = marketState[`imd${config.guppyTf}`]
  const rsiImd   = marketState[`imd${config.rsiTf}`]
  if (!rsiImd.rsi || !guppyImd.ema3) return false
  const rsiValue = rsiImd.rsi[0]
  const isGreen  = analysis.guppy.isSlowEMAColoredNow(guppyImd, 'green')
  if (isGreen && (rsiValue + config.rsiThreshold > 50)) {
    logger.info({ message: 'buy signal', rsi: rsiValue, close: guppyImd.close[0] })
    return true
  } else {
    return false
  }
}

function shouldSell(marketState, config) {
  const logger   = config.logger
  const guppyImd = marketState[`imd${config.guppyTf}`]
  const rsiImd   = marketState[`imd${config.rsiTf}`]
  if (!rsiImd.rsi || !guppyImd.ema3) return false
  const rsiValue = rsiImd.rsi[0]
  const isRed    = analysis.guppy.isSlowEMAColoredNow(guppyImd, 'red')
  if (isRed && (rsiValue - config.rsiThreshold < 50)) {
    logger.info({ message: 'sell signal', rsi: rsiValue, close: guppyImd.close[0] })
    return true
  } else {
    return false
  }
}

function calculateSize(config, price) {
  switch (config.sizeMode) {
  case 'spot':
    return calculateSizeSpot(config.fixedPositionSize)
    break
  case 'contracts':
    return 0
    break
  case 'emulateContracts':
    return calculateSizeEmulateContracts(config.fixedPositionSize, price)
    break
  default:
    throw('Fix your config')
  }
}

function calculateSizeEmulateContracts(n, price) {
  return Math.round(((n * 10000) / price))
}

function calculateSizeSpot(n) {
  return n
}

function init(baseTimeframe, customConfig) {
  const config = Object.assign({}, defaultConfig, customConfig)
  const logger = config.logger
  console.log({ logger })
  const indicatorSpecs = {}
  indicatorSpecs[config.guppyTf] = analysis.guppy.allEMAs.map((period) => ['ema', period])
  indicatorSpecs[config.rsiTf]   = [ ['rsi'] ]
  const initialState = {
    positionBias:      undefined,  // 'long' or 'short'
    longFilled:        undefined,
    shortFilled:       undefined
  }
  function strategy(strategyState, marketState, executedOrders) {
    let state  = strategyState ? clone(strategyState) : initialState
    let orders = []
    let price  = marketState.imd1m.close[0]
    let size   = config.fixedPositionSize // (config.fixedPositionSize * 10000) / price
    //let size   = (config.fixedPositionSize * 10000) / price
    //console.log('>> ', config.fixedPositionSize, (config.fixedPositionSize * 10000) / price)

    // handle executedOrders
    if (executedOrders && executedOrders.length) {
      executedOrders.forEach((o) => {
        if (o.id === 'open-long' && o.status === 'filled') {
          state.positionBias = 'long'
          state.longFilled = true
        }
        if (o.id === 'open-short' && o.status === 'filled') {
          state.positionBias = 'short'
          state.shortFilled = true
        }
      })
    }

    switch (state.positionBias) {
    case 'long':
      // If we're long, figure out if we need to reverse position and go short.
      if (shouldSell(marketState, config)) {
        let lastSize = state.lastSize
        let size = calculateSize(config, price)
        orders.push({
          id: 'close-long',
          type: 'market',
          action: 'sell',
          quantity: lastSize
        }, {
          id: 'open-short',
          type: 'market',
          action: 'sell',
          quantity: size
        })
        state.lastSize = size
        state.shortFilled = false
      }
      break;
    case 'short':
      // If we're short, figure out if we need to reverse position and go long.
      if (shouldBuy(marketState, config)) {
        let lastSize = state.lastSize
        let size = calculateSize(config, price)
        orders.push({
          id: 'close-short',
          type: 'market',
          action: 'buy',
          quantity: lastSize
        }, {
          id: 'open-long',
          type: 'market',
          action: 'buy',
          quantity: size
        })
        state.lastSize = size
        state.longFilled = false
      }
      break;
    default:
      // If we're not in a position, figure out which way to go.
      if (shouldBuy(marketState, config)) {
        let size = calculateSize(config, price)
        orders.push({
          id: 'open-long',
          type: 'market',
          action: 'buy',
          quantity: size
        })
        state.lastSize = size
        state.longFilled = false
      }
      if (shouldSell(marketState, config)) {
        let size = calculateSize(config, price)
        orders.push({
          id: 'open-short',
          type: 'market',
          action: 'sell',
          quantity: size
        })
        state.lastSize = size
        state.shortFilled = false
      }
    }
    return [state, orders]
  }
  return [indicatorSpecs, strategy]
}

module.exports = {
  defaultConfig,
  shouldBuy,
  shouldSell,
  calculateSize,
  init
}
