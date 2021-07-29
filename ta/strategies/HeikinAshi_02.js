/**

 HeikinAshi_02
 - Trailing Stop Losses
   After a position survives for config.trailingStart candles,
   set the stop loss price to the haClose of config.trailingLag candles in the past.
 - Also require 12/26 EMA alignment before allowing a directional bias, long or short.
 - (nice to have) After closing a position, don't wait an extra candle to make another decision.
 - (nice to have) Have a more nuanced view of indecision.

 HeikinAshi_01
 - Static Stop Losses
   When opening a position, place a stop loss at the close of the previous heikin ashi candle.
   (Eventually, I want trailing stop losses, but maybe that comes in HeikinAshi_02.)

 HeikinAshi_00
 - This strategy uses Heikin Ashi + Moving Averages for trend analysis.
 - Various heuristics using the moving averages will determine whether
   the strategy is allowed to long or short.
 - Heikin Ashi confluence in a high and low timeframe will be used for
   making entries.


  Trend Analysis Rules
  --------------------

  - A 12 EMA and 26 EMA will be used on the trendTf.
  - (Long) If 12 EMA > 26 EMA and
    a bullish heikin ashi candle is present on trendTf,
    you're allowed to long.
  - (Short) If 12 EMA < 26 EMA and
    a bearish heikin ashi candle is present on trendTf,
    you're allowed to short.

*/

const clone    = require('clone')
const uuid     = require('uuid')
const analysis = require('../analysis')
const ha       = analysis.candles.ha
const time     = require('../time')
const utils    = require('../utils')

const defaultConfig = {
  trendTf:           '30m',    // higher timeframe used for trend determination
  entryTf:           '1m',     // lower timeframe used for entry decisions
  trailingStart:     5,        // start moving the stop loss after the position survives this many candles
  trailingLag:       2,        // use the heikin ashi close of this many candles back
  sizeMode:          'spot',
  fixedPositionSize: 1
}

function configSlug(config) {
  return `${config.trendTf}-${config.entryTf}`
}

/**
 * Wait until the candle is closed (or almost closed) before making a decision
 * @param {MarketState} marketState - pipeline-generated collection of InvertedMarketData objects
 * @param {String} timeframe - timeframe for decision-making candle
 * @param {Number} frontrun - Make decision this many minutes before candle completion.  (Default 0)
 */
function candleReady(marketState, timeframe, frontrun=0) {
  const timestamp = marketState.imd1m.timestamp[0] + (60 * 1000 * frontrun)
  const dt = time.dt(timestamp)
  return time.isTimeframeBoundary(timeframe, dt)
}

/**
 * Determine if the strategy is allowed to open a long position.
 * @param {MarketState} marketState - pipeline-generated collection of InvertedMarketData objects
 * @param {Object} config - strategy configuration
 * @param {Number} offset - Number of candles to look back.  (Default: 1)  XXX If you use candleReady to front-run, this needs to be 0
 * @returns {Boolean} true if opening long positions is allowed
 */
function allowedToLong(marketState, config, offset=1) {
  const tf = config.trendTf
  const imdTrend = marketState[`imd${tf}`]
  const haClose = imdTrend.haClose[offset]
  const ema12 = imdTrend.ema12[offset]
  const ema26 = imdTrend.ema26[offset]
  if ((haClose > ema12) && (haClose > ema26) && (ha.color(imdTrend, offset) == 'green')) {
    return true
  } else {
    return false
  }
}

function allowedToShort(marketState, config, offset=1) {
  const tf = config.trendTf
  const imdTrend = marketState[`imd${tf}`]
  const haClose = imdTrend.haClose[offset]
  const ema12 = imdTrend.ema12[offset]
  const ema26 = imdTrend.ema26[offset]
  if ((haClose < ema12) && (haClose < ema26) && (ha.color(imdTrend, offset) == 'red')) {
    return true
  } else {
    return false
  }
}

/**
 * Determine whether profit should be taken on a position
 * @param {MarketState} marketState - pipeline-generated collection of InvertedMarketData objects
 * @param {Object} config - strategy configuration
 * @param {String} condition - 'red' to close a long position or 'green' to close a short position.
 * @param {Number} offset - Number of candles to look back.  (Default: 1)  XXX If you use candleReady to front-run, this needs to be 0
 */
function shouldTakeProfit(marketState, config, condition, offset=1) {
  const tf = config.trendTf
  const imdTrend = marketState[`imd${tf}`]
  if (ha.isIndecisive(imdTrend, offset)) {
    return false
  } else {
    if (ha.color(imdTrend, offset) === condition) {
      return true
    } else {
      return false
    }
  }
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

const __once = {}
/**
 * Ensure that cb is only run once per candle
 * @param {String} timeframe - timeframe of candle
 * @param {String} label - name of operation
 * @param {Number} currentTime - millisecond timestamp of current time
 * @param {Function} cb - operation to perform once per candle
 */
function oncePerCandle(timeframe, label, currentTime, cb) {
  // With timeframe, label, and currentTime, create a key for the current candle.
  const ts = time.timestampForTimeframe(timeframe, currentTime)
  const key = `${label}__${ts}`
  // If once[key] has not been set yet, run cb and return true.
  if (!__once[key]) {
    cb()
    __once[key] = true
    return true
  }
  // Else return false
  return false
}

function init(customConfig) {
  const config = Object.assign({}, defaultConfig, customConfig)
  const logger = config.logger

  const htf = [ ['heikinAshi'], ['ema', 12], ['ema', 26] ]
  const ltf = [ ['heikinAshi'] ]
  const indicatorSpecs = {}
  indicatorSpecs[config.trendTf] = htf
  // This allows trendTf and entryTf to be the same.
  // This usually only happens during debugging.
  if (config.trendTf !== config.entryTf) {
    indicatorSpecs[config.entryTf] = ltf
  }
  const initialState = {
    name:        'neutral',
    count:       0,                      // number of config.trendTf candles the position has survived
    openLongId:  undefined,              // strategy-generated order ids
    openShortId: undefined,              // same
    stopId:      undefined,              // same
  }

  // On timeframe boundaries, I should check if heikin ashi changed colors.
  function strategy(strategyState, marketState, executedOrders) {
    const state    = strategyState || initialState
    const imdTrend = marketState[`imd${config.trendTf}`]
    const imdEntry = marketState[`imd${config.entryTf}`]
    const tf       = config.trendTf
    let price      = imdTrend.close[0]

    const orders   = []

    // handle executedOrders
    // This means update the strategyState to reflect new order executions
    if (executedOrders && executedOrders.length) {
      executedOrders.forEach((o) => {
        if (o.id && o.id === state.openLongId && o.status === 'filled') {
          if (state.name === 'want-to-long') {
            state.name = 'long'
            state.count = 1
          } else {
            state.name = 'neutral'
            state.count = 0
            if (state.stopId) {
              orders.push({
                id:     state.stopId,
                type:   'stop-market',
                action: 'cancel'
              })
            }
          }
        }
        if (o.id && o.id === state.openShortId && o.status === 'filled') {
          if (state.name === 'want-to-short') {
            state.name = 'short'
            state.count = 1
          } else {
            state.name = 'neutral'
            state.count = 0
            if (state.stopId) {
              orders.push({
                id:     state.stopId,
                type:   'stop-market',
                action: 'cancel'
              })
            }
          }
        }
        if (o.id && o.id === state.stopId && o.status === 'filled') {
          state.name = 'neutral'
          //newState.stopId = undefined
          logger.debug('stop loss filled')
        }
        if (o.id && o.id === state.stopid && o.status === 'cancelled') {
          //newState.stopId = undefined
          logger.debug('stop loss cancelled')
        }
      })
    }

    const newState = clone(state)

    switch (state.name) {
    case 'neutral':
      // determine whether we want to look for longs or shorts
      if (candleReady(marketState, config.trendTf, 0)) {
        const mayLong = allowedToLong(marketState, config)
        const mayShort = allowedToShort(marketState, config)
        if (mayLong) {
          newState.name = 'want-to-long'
        }
        if (mayShort) {
          newState.name = 'want-to-short'
        }
        if (mayLong && mayShort) {
          // If they're both true, the market may be in a weird place, so let's stay neutral.
          newState.name = 'neutral'
        }
      }
      break;
    case 'want-to-long':
      // try to open a long position
      let longSize = calculateSize(config, price)
      newState.openLongId = uuid.v4()
      newState.stopId = uuid.v4()
      orders.push({
        id:       newState.openLongId,
        type:     'market',
        action:   'buy',
        quantity: longSize
      }, {
        id:       newState.stopId,
        type:     'stop-market',
        action:   'sell',
        quantity: longSize,
        price:    imdTrend.haOpen[0]
      })
      newState.lastSize = longSize
      break;
    case 'long':
      // look for ways to exit the long position in profit or minimal loss
      if (candleReady(marketState, config.trendTf, 0)) {
        oncePerCandle(config.trendTf, 'update-long-trailing-stop', imdEntry.timestamp[0], () => {
          newState.count += 1
          if (newState.count >= config.trailingStart) {
            orders.push({
              id: state.stopId,
              type: 'stop-market',
              action: 'update',
              price: imdTrend.haClose[2]
            })
            console.log(`Long trailing stop: ${imdTrend.haClose[2]}`)
          }
        })
        if (shouldTakeProfit(marketState, config, 'red')) {
          newState.openShortId = uuid.v4()
          orders.push({
            id:       newState.openShortId,
            type:     'market',
            action:   'sell',
            quantity: state.lastSize
          })
        }
      }
      break;
    case 'want-to-short':
      // try to open a short position
      let shortSize = calculateSize(config, price)
      newState.openShortId = uuid.v4()
      newState.stopId = uuid.v4()
      orders.push({
        id:       newState.openShortId,
        type:     'market',
        action:   'sell',
        quantity: shortSize
      },{
        id:       newState.stopId,
        type:     'stop-market',
        action:   'buy',
        quantity: shortSize,
        price:    imdTrend.haOpen[0]
      })
      newState.lastSize = shortSize
      break;
    case 'short':
      // look for ways to exit the short position in profit or minimal loss
      if (candleReady(marketState, config.trendTf, 0)) {
        oncePerCandle(config.trendTf, 'update-long-trailing-stop', imdEntry.timestamp[0], () => {
          newState.count += 1
          if (newState.count >= config.trailingStart) {
            orders.push({
              id: state.stopId,
              type: 'stop-market',
              action: 'update',
              price: imdTrend.haClose[2]
            })
            console.log(`Short trailing stop: ${imdTrend.haClose[2]}`)
          }
        })
        if (shouldTakeProfit(marketState, config, 'green')) {
          newState.openLongId = uuid.v4()
          orders.push({
            id:       newState.openLongId,
            type:     'market',
            action:   'buy',
            quantity: state.lastSize
          })
        }
      }
      break;
    }

    return [newState, orders]
  }

  return [indicatorSpecs, strategy]
}

function plot(vars) {
}

module.exports = {
  defaultConfig,
  configSlug,
  candleReady,
  allowedToLong,
  allowedToShort,
  calculateSize,
  calculateSizeEmulateContracts,
  calculateSizeSpot,
  __once,
  oncePerCandle,
  init,
  plot
}

/**

   GNUPLOT

   // 30m
   set xdata time
   set timefmt "%Y-%m-%dT%H:%M:%S"
   set boxwidth 0.8 relative
   plot [][30000:60000] "30m.data" using 1:7:8:9:10 title "BTC/USD Heikin Ashi" with candlesticks, "" using 1:11 title "12 EMA" with line lc rgb "green", "" using 1:12 title "26 EMA" with line lc rgb "red", "orders.data" using 1:2:(stringcolumn(4) eq "buy" ? 9 : 11) title "Orders" with points pointsize 3 pt var lc rgb "orange"

   // 1d
   plot [][30000:60000] "1d.data" using 1:7:8:9:10 title "BTC/USD Heikin Ashi" with candlesticks, "" using 1:11 title "12 EMA" with line lc rgb "green", "" using 1:12 title "26 EMA" with line lc rgb "red", "orders.data" using 1:2:(stringcolumn(4) eq "buy" ? 9 : 11) title "Orders" with points pointsize 3 pt var lc rgb "orange"


 */
