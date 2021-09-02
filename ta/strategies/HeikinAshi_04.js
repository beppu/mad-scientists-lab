/**

 - This strategy is based on 00, only using Hull + State Machine
 - aiming for more precision with less code
 - this experiment is successful if it trades as well as the previous strategies

*/

const StateMachine = require('javascript-state-machine');
const StateMachineHistory = require('javascript-state-machine/lib/history')
const clone    = require('clone')
const uuid     = require('uuid')
const analysis = require('../analysis')
const ha       = analysis.candles.ha
const time     = require('../time')
const utils    = require('../utils')

const defaultConfig = {
  trendTf:           '30m',    // higher timeframe used for trend determination
  entryTf:           '1m',     // lower timeframe used for entry decisions
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
  const hma55 = imdTrend.hma55[offset]
  if (haClose > hma55 && (ha.color(imdTrend, offset) == 'green')) {
    return true
  } else {
    return false
  }
}

function allowedToShort(marketState, config, offset=1) {
  const tf = config.trendTf
  const imdTrend = marketState[`imd${tf}`]
  const haClose = imdTrend.haClose[offset]
  const hma55 = imdTrend.hma55[offset]
  if (haClose < hma55 && (ha.color(imdTrend, offset) == 'red')) {
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
  /*
  // Wait for the color to change.
  if (ha.color(imdTrend, offset) === condition) {
    // However, if the candle looks indecisive, wait.  Stay in position.
    if (ha.isIndecisive(imdTrend, offset)) { // I'd like to give this some kind of threshold
      return false
    } else {
      return true
    }
  }
  return false
  */
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

function handleExecutedOrders(state, marketState, executedOrders) {
  if (executedOrders && executedOrders.length) {
    executedOrders.forEach((o) => {
      if (o.id && o.id === state.openLongId && o.status === 'filled') {
        if (state.state === 'want-to-long') {
          state.filledLong()
        }
        if (state.state === 'closing') {
          state.finish()
        }
      }
      if (o.id && o.id === state.openShortId && o.status === 'filled') {
        if (state.state === 'want-to-short') {
          state.filledShort()
        }
        if (state.state === 'closing') {
          state.finish()
        }
      }
      if (o.id && o.id === state.openStopId && o.status === 'filled') {
        state.openStopId = undefined
        state.stop()  // XXX stopped -> neutral is only for record keeping
        state.reset() // XXX immediate transition back to neutral is OK here.
      }
      if (o.id && o.id === state.openStopId && o.status === 'updated') {
        const nextState = (o.action === 'buy') ? 'short' : 'long'
        state.confirmStop(nextState, o)
      }
    })
  }
}

function confirmStop(nextState, o) {
  console.log('-----', {nextState, o})
  if (o) this.state.stopPrice = o.price
  return nextState
}

function initFSM() {

  const
  fsm = new StateMachine({
    init: 'neutral',
    transitions: [
      { name: 'goLong',      from: 'neutral',         to: 'want-to-long' },
      { name: 'filledLong',  from: 'want-to-long',    to: 'long' },
      { name: 'goShort',     from: 'neutral',         to: 'want-to-short' },
      { name: 'filledShort', from: 'want-to-short',   to: 'short' },
      { name: 'updateStop',  from: ['long', 'short'], to: 'updating-stop' },
      { name: 'confirmStop', from: 'updating-stop',   to: confirmStop },
      { name: 'close',       from: ['long', 'short'], to: 'closing' },
      { name: 'stop',        from: ['long', 'short'], to: 'stopped' },
      { name: 'reset',       from: 'stopped',         to: 'neutral' },
      { name: 'finish',      from: 'closing',         to: 'neutral' },
    ],
    data: {
      openShortId: undefined,
      openLongId:  undefined,
      openStopId:  undefined,
      stopPrice:   undefined,
      orders:      [],
      config:      {},
    },
    plugins: [
      new StateMachineHistory()
    ],
    methods: {
      onWantToLong(event, price, stop) {
        console.log('onWantToLong')
        let longSize = calculateSize(this.config, price)
        this.openLongId = uuid.v4()
        this.openStopId = uuid.v4()
        this.stopPrice = stop
        this.lastSize = longSize
        this.orders.push({
          id:       this.openLongId,
          type:     'market',
          action:   'buy',
          quantity: longSize
        }, {
          id:       this.openStopId,
          type:     'stop-market',
          action:   'sell',
          quantity: longSize,
          price:    stop
        })
      },
      //onBeforeLong: () => allowedToLong(marketState, config),
      onLong(event, id) {
        console.log('long')
      },
      onWantToShort(event, price, stop) {
        console.log('onWantToShort')
        let shortSize = calculateSize(this.config, price)
        this.openShortId = uuid.v4()
        this.openStopId = uuid.v4()
        this.stopPrice = stop
        this.lastSize = shortSize
        this.orders.push({
          id:       this.openShortId,
          type:     'market',
          action:   'sell',
          quantity: shortSize
        }, {
          id:       this.openStopId,
          type:     'stop-market',
          action:   'buy',
          quantity: shortSize,
          price:    stop
        })
      },
      //onBeforeShort: () => allowedToShort(marketState, config),
      onShort: function(event, id) {
        console.log('short')
      },
      onClose(event) {
        console.log(`state is ${this.state} from ${event.from}`)
        if (event.from === 'long') {
          console.log('closing long')
          this.openShortId = uuid.v4()
          this.orders.push({
            id:       this.openShortId,
            type:     'market',
            action:   'sell',
            quantity: this.lastSize
          }, {
            id:       this.openStopId,
            type:     'stop-market',
            action:   'cancel',
            quantity: this.lastSize
          })
        } else if (event.from === 'short') {
          console.log('closing short')
          this.openLongId = uuid.v4()
          this.orders.push({
            id:       this.openLongId,
            type:     'market',
            action:   'buy',
            quantity: this.lastSize
          }, {
            id:       this.openStopId,
            type:     'stop-market',
            action:   'cancel',
            quantity: this.lastSize
          })
        } else {
          console.warn(`Can't ${this.state}.`)
        }
      },
      onUpdateStop(event, price) {
        console.log({ price, stopPrice: this.stopPrice })
        if (event.from === 'long') {
          console.log('pushing stop update order')
          // If the price is greater, move the stop up.
          if (price > this.stopPrice) {
            this.orders.push({
              id:       this.openStopId,
              type:     'stop-market',
              action:   'update',
              price:    price
            })
          }
        } else if (event.from === 'short') {
          // If the price moves down, move the stop down.
          if (price < this.stopPrice) {
            this.orders.push({
              id:       this.openStopId,
              type:     'stop-market',
              action:   'update',
              price:    price
            })
          }
        }
      },
      onNeutral() {
        // TODO close positions
        console.log('neutral')
      },
    }
  })

  return fsm

}

function init(customConfig) {
  const config = Object.assign({}, defaultConfig, customConfig)
  const logger = config.logger

  const htf = [ ['heikinAshi'], ['hma', 55], [ 'bbands' ] ]
  const ltf = [ ['heikinAshi'] ]
  const indicatorSpecs = {}
  indicatorSpecs[config.trendTf] = htf
  // This allows trendTf and entryTf to be the same.
  // This usually only happens during debugging.
  if (config.trendTf !== config.entryTf) {
    indicatorSpecs[config.entryTf] = ltf
  }
  // const initialState = {
  //   name:         'neutral',
  //   mayLong:      undefined,
  //   mayShort:     undefined,
  //   longFilled:   undefined,
  //   shortFilled:  undefined,
  //   done:         []
  // }


  // On timeframe boundaries, I should check if heikin ashi changed colors.
  function strategy(strategyState, marketState, executedOrders) {
    const state    = strategyState || initFSM()
    const imdTrend = marketState[`imd${config.trendTf}`]
    const imdEntry = marketState[`imd${config.entryTf}`]
    const tf       = config.trendTf
    let price      = imdTrend.close[0]
    state.config   = config

    // handle executedOrders
    handleExecutedOrders(state, marketState, executedOrders)

    switch (state.state) {
    case 'neutral':
      // determine whether we want to look for longs or shorts
      if (candleReady(marketState, config.trendTf, 0)) {
        const mayLong = allowedToLong(marketState, config)
        const mayShort = allowedToShort(marketState, config)
        if (mayLong && mayShort) {
          // If they're both true, the market may be in a weird place, so let's stay neutral.
        } else {
          if (mayLong) {
            state.goLong(price, imdTrend.lowerBand[0])
          } else {
            console.log(`go short ${state.state}`, price)
            state.goShort(price, imdTrend.upperBand[0])
          }
        }
      }
      break;
    case 'long':
      // look for ways to exit the long position in profit or minimal loss
      if (candleReady(marketState, config.trendTf, 0)) {
        if (shouldTakeProfit(marketState, config, 'red')) {
          console.log('trying to close long')
          state.close()
        } else {
          // Only updateStop if you have to
          if (imdTrend.lowerBand[0] > state.stopPrice) {
            console.log(`updating stop ${imdTrend.lowerBand[0]} > ${state.stopPrice}`)
            state.updateStop(imdTrend.lowerBand[0])
          }
        }
      }
      break;
    case 'short':
      // look for ways to exit the short position in profit or minimal loss
      if (candleReady(marketState, config.trendTf, 0)) {
        if (shouldTakeProfit(marketState, config, 'green')) {
          console.log('trying to close short')
          state.close()
        } else {
          // Only updateStop if you have to
          if (imdTrend.upperBand[0] < state.stopPrice) {
            state.updateStop(imdTrend.upperBand[0])
          }
        }
      }
      break;
    }
    let orders = state.orders
    state.orders = []
    if (state.state === 'updating-stop') {
      console.log('orders', time.iso(imdEntry.timestamp[0]), orders)
    }

    return [state, orders]
  }

  return [indicatorSpecs, strategy]
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
  handleExecutedOrders,
  init
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
