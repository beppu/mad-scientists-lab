/**
 * This strategy uses high timeframe Heikin Ashi to determine the trend
 * and low timeframe Bollinger Bands to pick an entry.
 */

const clone = require('clone')
const uuid = require('uuid')
const analysis = require('../analysis')
const time = require('../time')
const utils = require('../utils')

const defaultConfig = {
  trendTf: '4h',    // high timeframe used for trend determination
  entryTf: '3m',    // lower timeframe used for entry decisions
  sizeMode: 'spot',
  fixedPositionSize: 1
}

function configSlug(config) {
  return `${config.trendTf}`
}

function haColor(imd, i=0) {
  return (imd.haOpen[i] < imd.haClose[i]) ? 'green' : 'red'
}

function shouldBuy(marketState, strategyState, config) {
  const logger = config.logger
  const tf = config.trendTf
  const etf = config.entryTf
  const imdTrend = marketState[`imd${tf}`]
  const imdEntry = marketState[`imd${etf}`]
  if (time.isTimeframeBoundary(tf, time.dt(imdEntry.timestamp[0]))) {
    const ts = time.iso(imdTrend.timestamp[1])
    if (!strategyState.done[ts]) {
      const color2 = haColor(imdTrend, 2)
      const color1 = haColor(imdTrend, 1)
      if (color2 === 'red' && color1 === 'green') {
        logger.info({ ts, message: 'buy', close: imdEntry.close[0] })
        return true
      } else {
        return false
      }
    }
  }
  return false
}

function shouldSell(marketState, strategyState, config) {
  const logger = config.logger
  const tf = config.trendTf
  const etf = config.entryTf
  const imdTrend = marketState[`imd${tf}`]
  const imdEntry = marketState[`imd${etf}`]
  if (time.isTimeframeBoundary(tf, time.dt(imdEntry.timestamp[0]))) {
    const ts = time.iso(imdTrend.timestamp[1])
    if (!strategyState.done[ts]) {
      const color2 = haColor(imdTrend, 2)
      const color1 = haColor(imdTrend, 1)
      if (color2 === 'green' && color1 === 'red') {
        logger.info({ ts, message: 'sell', close: imdEntry.close[0] })
        return true
      } else {
        return false
      }
    }
  }
  return false
}

function calculateSize(config, price) {
  switch (config.sizeMode) {
  case 'spot':
    return calculateSizeSpot(config.fixedPositionSize)
    break
  case 'contracts':
    return config.fixedPositionSize
    break
  case 'emulateContracts':
    return calculateSizeEmulateContracts(config.fixedPositionSize, price)
    break
  default:
    throw('Fix your config')
  }
}

function calculateSizeEmulateContracts(n, price) {
  return utils.round(((n * 10000) / price), 100)
}

function calculateSizeSpot(n) {
  return n
}

function init(customConfig) {
  const config = Object.assign({}, defaultConfig, customConfig)
  const logger = config.logger

  const indicatorSpecs = {}
  indicatorSpecs[config.trendTf] = [ ['heikinAshi'] ]
  indicatorSpecs[config.entryTf] = [ ['bbands'] ]
  const initialState = {
    positionBias: undefined,
    longFilled:   undefined,
    shortFilled:  undefined,
    done:         []
  }

  // On timeframe boundaries, I should check if heikin ashi changed colors.
  function strategy(strategyState, marketState, executedOrders) {
    const state = strategyState || initialState
    const orders = []
    const imdTrend = marketState[`imd${config.trendTf}`]
    const imdEntry = marketState[`imd${config.entryTf}`]
    const tf = config.trendTf
    let price  = imdTrend.close[0]

    // handle executedOrders
    // This means update the strategyState to reflect new order executions
    if (executedOrders && executedOrders.length) {
      executedOrders.forEach((o) => {
        if (o.id === state.openLongId && o.status === 'filled') {
          state.positionBias = 'long'
          state.longFilled = true
        }
        if (o.id === state.openShortId && o.status === 'filled') {
          state.positionBias = 'short'
          state.shortFilled = true
        }
      })
    }

    switch (state.positionBias) {
    case 'long':
      // If we're long, figure out if we need to reverse position and go short.
      if (shouldSell(marketState, state, config)) {
        let lastSize = state.lastSize
        let size = calculateSize(config, price)
        state.openShortId = uuid.v4()
        orders.push({
          type: 'market',
          action: 'sell',
          quantity: lastSize
        }, {
          id: state.openShortId,
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
      if (shouldBuy(marketState, state, config)) {
        let lastSize = state.lastSize
        let size = calculateSize(config, price)
        state.openLongId = uuid.v4()
        orders.push({
          type: 'market',
          action: 'buy',
          quantity: lastSize
        }, {
          id: state.openLongId,
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
      if (shouldBuy(marketState, state, config)) {
        let size = calculateSize(config, price)
        state.openLongId = uuid.v4()
        orders.push({
          id: state.openLongId,
          type: 'market',
          action: 'buy',
          quantity: size
        })
        state.lastSize = size
        state.longFilled = false
      }
      if (shouldSell(marketState, state, config)) {
        let size = calculateSize(config, price)
        state.openShortId = uuid.v4()
        orders.push({
          id: state.openShortId,
          type: 'market',
          action: 'sell',
          quantity: size
        })
        state.lastSize = size
        state.shortFilled = false
      }
      // It's possible that neither is true in which case it should continue to do nothing.
    }
    // after the switch statement, mark the candle done if necessary.
    if (time.isTimeframeBoundary(tf, time.dt(imdEntry.timestamp[0]))) {
      const ts = time.iso(imdTrend.timestamp[1])
      if (!state.done[ts]) {
        state.done[ts] = true
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
