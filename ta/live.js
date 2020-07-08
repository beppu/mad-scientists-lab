/**
 * Bring all these together into an object that can be used interactively.
 *
 * - candle consumption (batch and realtime)
 * - candle aggregation
 * - indicator calculation
 * - strategy execution
 * - exchange execution
 */

const Promise    = require('bluebird')
const pino       = require('pino')
const luxon      = require('luxon')
const clone      = require('clone')
const ta         = require('./index')
const utils      = require('./utils')
const pipeline   = require('./pipeline')
const strategies = require('./strategies')
const research   = require('./research')
const exchanges  = require('./exchanges')

const {DateTime} = luxon

const DEFAULT_LOGGER = pino()

function findStrategy(name) {
  if (strategies[name]) return strategies[name]
  if (research[name]) return research[name]
  return undefined
}

class Trader {
  constructor({dataDir, exchange, market, strategy, options, logger}) {
    this.opts = { dataDir, exchange, market, strategy, options }
    this.logger = logger || DEFAULT_LOGGER
    this.baseTimeframe = '1m' // XXX It would be nice to not hardcode this, but I almost always want 1m for live trading
    // XXX I'm not sure if I really need baseTimeframe anymore.
    // XXX I think I may have made changes to pipeline.js that made it unnecessary
    this.isWarmedUp = false
    this.isRealtime = false
    this.exchange = exchanges[exchange]
    this.symbol = market.replace(/\//, '')

    // Instantiate strategy and get its indicatorSpecs
    const _s = findStrategy(strategy)
    if (!_s) throw(`Can't find strategy '${strategy}'`)
    let [indicatorSpecs, s] = _s.init(this.baseTimeframe, Object.assign({ logger }, options))
    this.strategy = s
    this.indicatorSpecs = indicatorSpecs
    // Instantiate a pipeline with the strategy's indicatorSpecs
    this.mainLoop = pipeline.mainLoopFn(this.baseTimeframe, indicatorSpecs)
    // Setup variables used by the loop
    this.marketState = undefined
    this.strategyState = undefined
    this.orders = undefined
    this.executedOrders = undefined
    this.initializeTradeExecutor()
  }
  // XXX - I can't implment a full trader yet.
  // I need exchanges/bybit to implement more of the exchange bits.
  // Position Before Submission

  initializeTradeExecutor() {
    const options = Object.assign({ }, this.exchangeOptions || {})
    this.executor = this.exchange.create(options)
  }

  async sanityCheck() {
    // TODO - Make sure we have some data in the FS first
    return true
  }

  async warmUp(since) {
    await this.sanityCheck()
    // This is the same for both.
    // Load candles from the filesystem until we can't.
    const nextCandle = await pipeline.loadCandlesFromFS(this.opts.dataDir, this.opts.exchange, this.opts.market, this.baseTimeframe, since)
    let candle = await nextCandle()
    while (candle) {
      this.marketState = this.mainLoop(candle)
      candle = await nextCandle()
    }
    // Get websockets started in the background so switching can be seemless later.
    const [ws, events] = this.exchange.connect(undefined) // XXX undefined should be an API key
    this.ws = ws
    this.events = events
    this.pingInterval = this.exchange.pingAtInterval(ws, 30000)
    this.candleChannel = await this.exchange.subscribeCandles(this.ws, this.opts.market)
    // Load from memory one last time if necessary.
    /*
      DONE - This is the part I hate.
      Loading up 1m candles from the beginning of an exchange's trading history can
      take considerably longer than 1m.  Furthermore, I don't have any guarantee that
      the FS has enough data downloaded.

      Once I get to the end of what the FS has, I have to fill the gap in time from
      the end of the FS to the current minute, and for ByBit, it can't be more than
      200 minutes.  For BitMEX, it can't be more than 1000 minutes.
     */
    let lastTimestamp = this.marketState.imd1m.timestamp[0]
    let limit = this.exchange.limits.maxCandles || 200
    let candles = await ta.loadCandles(this.opts.exchange, this.opts.market, this.baseTimeframe, lastTimestamp, limit)
    /*
      DONE - give ta.loadCandles a limit parameter
      DONE - store exchange limits in exchanges/$exchange.js
     */
    console.log('candles', candles)
    candles.forEach((c) => this.marketState = this.mainLoop(c))
    this.isWarmedUp = true
  }

  async switchToRealtime() {
    // This is the same for both.
    if (this.isWarmedUp) {
      this.events.on(this.candleChannel, (message) => {
        const candles = (message.data)
          ? message.data.map((d) => [ d.start * 1000, d.open, d.high, d.low, d.close, d.volume ])
          : []
        this.iterate(candles)
      })
    } else {
      throw("We're not warmed up yet.")
    }
    this.isRealtime = true
  }

  /**
   * Start the strategy
   */
  async start() {
    // Not sure if this will be the same or not.
  }

  async stop() {
    // Note that stopping a strategy doesn't mean that candle consumption is stopped.
    // It only means that strategy execution is stopped.
    // That should keep going until the trader instance is no longer being used.
  }

  async reset() {
    // Reset the strategy to its initial state.
  }

  async go(since) {
    // TODO Use a default since that goes back far enough to get 1000 candles for the largest requested timeframe.
    await this.warmUp(since)
    await this.switchToRealtime()
    await this.start()
  }

  lastCandle() {
    const i = this.marketState.imd1m
    const candle = [
      i.timestamp[0],
      i.open[0],
      i.high[0],
      i.low[0],
      i.close[0],
      i.volume[0],
    ]
    return candle
  }

  async iterate(candles) {
    // This is not async and I think this is where I'm going to differentiate
    // between live testing and live trading.
    Promise.each(candles, async (c) => {
      this.marketState = this.mainLoop(c)
      // give marketState to strategy
      let xo = clone(this.executedOrders)
      let [strategyState, orders] = this.strategy(this.strategyState, this.marketState, xo)
      this.strategyState = strategyState
      this.orders = orders.map((o) => { o.symbol = this.symbol; return o })
      this.executedOrders = undefined;
      // give orders to tradeExecutor
      let [exchangeState, executedOrders] = await this.executor(orders);
      this.exchangeState = exchangeState
      // this.executedOrders = executedOrders
      // XXX - I just realized that a real exchange can return executedOrders at any time.
    })
  }

  /**
   * Feed executedOrders into the strategy.
   * They will typically come back from the websocket.
   * This is unique to the Trader.  The simulator doesn't do this.
   * @param {Type of executedOrders} executedOrders - Parameter description.
   */
  async iterateExecutedOrders(executedOrders) {
  }
}

/*
   The main difference between trading and simulation is where execution happens.
   A Simulator instance may consume price from a real exchange, but execution happens
   on a simulated exchange.  Unfortunately, the function signature for a simulated
   exchange is different from a real exchange in that it needs to be fed candles.
 */
class Simulator extends Trader {
  constructor(opts) {
    super(opts)
  }

  initializeTradeExecutor() {
    const options = Object.assign({ balance: 100000 }, this.exchangeOptions || {})
    this.executor = exchanges.simulator.create(options)
  }

  // Is iteration the same?
  // Almost, but not quite.  The tradeExecutor is synchronous during simulation but async in live trading.
  iterate(candles) {
    // This is not async and I think this is where I'm going to differentiate
    // between live testing and live trading.
    Promise.each(candles, async (c) => {
      this.marketState = this.mainLoop(c)
      // give marketState to strategy
      let xo = clone(this.executedOrders)
      let [strategyState, orders] = this.strategy(this.strategyState, this.marketState, xo)
      this.strategyState = strategyState
      this.orders = orders
      this.executedOrders = undefined;
      // give orders to tradeExecutor
      let candle = this.lastCandle()
      let [exchangeState, executedOrders] = await this.executor(orders, this.exchangeState, candle);
      this.exchangeState = exchangeState
      this.executedOrders = executedOrders
      // XXX - I just realized that a real exchange can return executedOrders at any time.
    })
  }
}

const trade = {
  bybit: {
    BTCUSD(strategy, options={}) {
      options.baseURL = process.env.TA_BYBIT_BASE_URL
      options.key = process.env.TA_BYBIT_KEY
      options.secret = process.env.TA_BYBIT_SECRET
      return new Trader({ dataDir: 'data', exchange: 'bybit', market: 'BTC/USD', strategy, options })
    },
    ETHUSD(strategy, options={}) {
      options.baseURL = process.env.TA_BYBIT_BASE_URL
      options.key = process.env.TA_BYBIT_KEY
      options.secret = process.env.TA_BYBIT_SECRET
      return new Trader({ dataDir: 'data', exchange: 'bybit', market: 'ETH/USD', strategy, options })
    }
  }
}

const simulate = {
  bybit: {
    BTCUSD(strategy, options={}) {
      return new Simulator({ dataDir: 'data', exchange: 'bybit', market: 'BTC/USD', strategy, options, logger: DEFAULT_LOGGER })
    }
  }
}

const btc = trade.bybit.BTCUSD
const btcs = simulate.bybit.BTCUSD

module.exports = {
  Trader,
  Simulator,
  trade,
  simulate,
  btc,
  btcs
}

/**

   How do I use this thing?

   // Instantiate a live simulator with a Guppy strategy
   s = live.simulate.bybit.BTCUSD(...preset.guppy1m30m)
   since = DateTime.fromISO('2020-07-04')
   s.go(since).then(cl)

 */
