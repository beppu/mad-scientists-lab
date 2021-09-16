const StateMachine        = require('javascript-state-machine');
const StateMachineHistory = require('javascript-state-machine/lib/history')
const clone               = require('clone')
const uuid                = require('uuid')
const Handlebars          = require('handlebars')
const kindOf              = require('kind-of')

const time  = require('../time')
const utils = require('../utils')

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

/**
 * Create a customized strategy object.
 * @param {Object} opts - customization
 * @param {Array} opts.defaultSpecs - indicators for main trend timeframe (trendTf)
 * @param {Object} opts.defaultConfig - default strategy configuration
 * @param {Function} opts.allowedToLong - function for when to go long
 * @param {Function} opts.allowedToShort - function for when to go short
 * @param {Function} opts.shouldTakeProfit - function for when to exit a position.
 * @param {Function} opts.configSlug - (optional) function that makes a short string from the config to differentiate the directory name for backtested results
 * @param {String} opts.gnuplot - (optional) mustache template for gnuplot script for visualizing results
 */
function create(opts) {
  const {defaultSpecs, defaultConfig, allowedToLong, allowedToShort, shouldTakeProfit, getStopPrice} = opts
  const init  = (customConfig) => {
    const config = Object.assign({}, defaultConfig, customConfig)
    const logger = config.logger

    let indicatorSpecs
    if (kindOf(defaultSpecs) === 'array') {
      const htf = defaultSpecs
      indicatorSpecs = {}
      indicatorSpecs[config.trendTf] = htf
    } else if (kindOf(defaultSpecs) === 'function') {
      indicatorSpecs = defaultSpecs(config)
    }

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
              state.goLong(price, getStopPrice(config, marketState))
            } else if (mayShort) {
              console.log(`go short ${state.state}`, price)
              state.goShort(price, getStopPrice(config, marketState))
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
            if (getStopPrice(config, marketState) > state.stopPrice) {
              // console.log(`updating stop ${imdTrend.lowerBand[0]} > ${state.stopPrice}`)
              state.updateStop(getStopPrice(config, marketState))
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
            if (getStopPrice(config, marketState) < state.stopPrice) {
              state.updateStop(getStopPrice(config, marketState))
            }
          }
        }
        break;
      }
      let orders = state.orders
      state.orders = []
      if (state.state === 'updating-stop') {
        console.log('orders', orders)
      }

      return [state, orders]
    }
    return [indicatorSpecs, strategy]
  }

  // build strategy object
  const $Strategy = { init }
  if (opts.configSlug) {
    $Strategy.configSlug = opts.configSlug
  } else {
    $Strategy.configSlug = configSlug
  }
  if (opts.gnuplot) $Strategy.gnuplot = Handlebars.compile(opts.gnuplot)
  return $Strategy
}

module.exports = {
  create
}