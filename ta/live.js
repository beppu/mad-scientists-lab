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
const mkdirp     = require('mkdirp')

const ta         = require('./index')
const utils      = require('./utils')
const pipeline   = require('./pipeline')
const strategies = require('./strategies')
const research   = require('./research')
const exchanges  = require('./exchanges')
const log        = require('./log')
const time       = require('./time')

const {DateTime} = luxon

const LOG_LIVETEST = process.env.TA_LOG_LIVETEST || './log/livetest'
const LOG_TRADE    = process.env.TA_LOG_TRADE || './log/trade'

// TODO I need to factor this out and give it the ability to load strategies from arbitrary paths
// Maybe move this to index.js while I'm at it.  (It's that necessary to the system.)
function findStrategy(name) {
  if (strategies[name]) return strategies[name]
  if (research[name]) return research[name]
  return undefined
}

class Trader {
  constructor({dataDir, logDir, exchange, market, strategy, options}) {
    this.opts = { dataDir, logDir, exchange, market, strategy, options }
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

    // Setup variables used by the loop
    this.marketState = undefined
    this.strategyState = undefined
    this.orders = undefined
    this.executedOrders = undefined
    this.initializeExchangeDriver()
    this.initializeActivityLogger()
    this.announceSelf()
  }

  name() {
    return 'Trader'
  }

  announceSelf() {
    this.activityLogger.info({ name: this.name(), exchange: this.opts.exchange, market: this.opts.market, strategy: this.opts.strategy })
  }

  initializeStrategyAndPipeline(since) {
    // Instantiate strategy and get its indicatorSpecs
    const strategy = this.opts.strategy
    const options = this.opts.options
    const _s = findStrategy(strategy)
    if (!_s) throw(`Can't find strategy '${strategy}'`)
    let [indicatorSpecs, s] = _s.init(Object.assign({ logger: this.activityLogger }, options))
    indicatorSpecs.inverted = true
    this.strategy = s
    this.indicatorSpecs = indicatorSpecs
    // Instantiate a pipeline with the strategy's indicatorSpecs
    this.mainLoop = pipeline.mainLoopFn(this.baseTimeframe, indicatorSpecs)
    // Instantiate Executed Order Logger
    this.orderLogPath = log.fullExecutedOrderLogName(
      since,
      undefined,
      this.opts.logDir,
      [strategy, options],
      _s.configSlug // this is allowed to be undefined
    )
    this.orderLogger = log.createOrderLogger(
      since,
      undefined,
      this.opts.logDir,
      [strategy, options],
      _s.configSlug // this is allowed to be undefined
    )
  }

  initializeExchangeDriver() {
    // Get websockets started in the background so switching can be seemless later.
    const {key, secret, livenet} = this.opts.options
    this.driver = new this.exchange.Driver({ key, secret, livenet })
  }

  initializeActivityLogger() {
    mkdirp.sync(this.opts.logDir)
    this.activityLogger = pino(pino.destination(`${this.opts.logDir}/activity.log`))
  }

  /**
   * Summarize the current executed order log.
   * @returns {Object} a report on executed trades and profits/losses
   */
  summarize() {
    return log.summarizeOrderLog(this.orderLogPath)
  }

  async sanityCheck() {
    // TODO - Make sure we have some data in the FS first
    // Maybe this should go in pipeline.js if it ever gets written.
    return true
  }

  /**
   * Load as many candles as possible from the FS,
   * then load as many candles as necessary via the REST API to fill in the gaps,
   * and finally get the websocket connnection started in preparation for
   * switchToRealtime.
   * @param {DateTime} since - the timestamp for the earliest candle desired in marketState
   */
  async warmUp(since) {
    this.activityLogger.info({ message: 'warming up' })
    await this.sanityCheck()
    //console.log('since', since.toISO())
    this.initializeStrategyAndPipeline(since)
    // This is the same for both.
    // Load candles from the filesystem until we can't.
    const nextCandle = await pipeline.loadCandlesFromFS(this.opts.dataDir, this.opts.exchange, this.opts.market, this.baseTimeframe, since)
    let candle = await nextCandle()
    while (candle) {
      this.marketState = this.mainLoop(candle)
      candle = await nextCandle()
    }

    // Load from memory one last time if necessary.
    /*
      Loading up 1m candles from the beginning of an exchange's trading history can
      take considerably longer than 1m.  Furthermore, I don't have any guarantee that
      the FS has enough data downloaded.

      (Many months later, I realized that I don't have to start from the beginning of exchange history.)

      Once I get to the end of what the FS has, I have to fill the gap in time from
      the end of the FS to the current minute, and for ByBit, it can't be more than
      200 minutes.  For BitMEX, it can't be more than 1000 minutes.
     */
    let lastTimestamp = this.marketState.imd1m.timestamp[0]
    let limit = this.exchange.limits.maxCandles || 200
    let candles = await ta.loadCandles(this.opts.exchange, this.opts.market, this.baseTimeframe, lastTimestamp, limit)
    let z = candles.length - 1
    /*
      DONE - give ta.loadCandles a limit parameter
      DONE - store exchange limits in exchanges/$exchange.js
     */
    candles.forEach((c) => this.marketState = this.mainLoop(c))
    this.isWarmedUp = true
  }

  /**
   * In the event of a network disconnection, we must load up all the candles
   * we missed during the downtime and reconnect to the websocket.
   * @param {DateTime} _since - DateTime of last candle before disconnection
   */
  async catchUp(_since) {
    let lastTimestamp = this.marketState.imd1m.timestamp[0]
    console.log('lastTimestamp', lastTimestamp, time.iso(lastTimestamp))
    let limit = this.exchange.limits.maxCandles || 200
    let candles = await ta.loadCandles(this.opts.exchange, this.opts.market, this.baseTimeframe, lastTimestamp, limit)
    // TODO This doesn't handle the case where we need more than `limit` candles to catch up.
    candles.forEach((c) => this.marketState = this.mainLoop(c))
    this.isWarmedUp = true
  }

  /**
   * Call this once to start listening on a websocket.
   * @throws {Exception Type} Exception description.
   */
  async switchToRealtime() {
    // This is the same for both.
    if (this.isWarmedUp) {
      this.activityLogger.info({ message: 'switching to realtime' })
      const res = await this.driver.connect(this.opts.market, {
        // onCandle
        candle: (data) => {
          const candles = data.map((d) => [ d.start * 1000, d.open, d.high, d.low, d.close, d.volume ])
          this.iterate(candles)
        },
        // onExecution
        execution: (data) => {
          if (this.isStarted) {
            this.iterateExchangeEvents(data) // On the simulator, this will never happen, and that's OK.
          }
        },
        // response to websocket commands like subscribe
        response: (message) => {
          // What does this even look like?
          console.log('response', message)
        }
      })
    } else {
      throw("We're not warmed up yet.")
    }
    this.isRealtime = true
  }

  /**
   * Handle new candles
   * @param {Type of candles} candles - Parameter description.
   * @returns {Return Type} Return description.
   */
  async iterate(candles) {
    // This is not async and I think this is where I'm going to differentiate
    // between live testing and live trading.
    Promise.each(candles, async (c) => {
      this.marketState = this.mainLoop(c)
      // give marketState to strategy
      let xo = []
      let [strategyState, orders] = this.strategy(this.strategyState, this.marketState, xo)
      this.strategyState = strategyState
      if (orders) {
        let _orders = orders.map((o) => { o.symbol = this.symbol; return o })
        console.log('candles', _orders)
        let res = await this.driver.execute(_orders);
      }
    })
  }

  /**
   * Feed executedOrders into the strategy.
   * They will typically come back from the websocket.
   * This is unique to the Trader.  The simulator doesn't do this.
   * @param {Type of executedOrders} executedOrders - Parameter description.
   */
  async iterateExchangeEvents(exchangeEvents) {
    console.log('exchange events', exchangeEvents)
    exchangeEvents.filter((ev) => ev.type === 'position').forEach((ev) => {
      this.exchangeState = ev
    })
    let [strategyState, orders] = this.strategy(this.strategyState, this.marketState, exchangeEvents)
    this.strategyState = strategyState
    if (orders) {
      let _orders = orders.map((o) => { o.symbol = this.symbol; return o })
      console.log('ee', _orders)
      let res = await this.driver.execute(_orders);
    }
  }

  /**
   * Start the strategy
   * @param {DateTime} since - datetime to start marketData calculation
   */
  async go(since) {
    // TODO Use a default since that goes back far enough to get 1000 candles for the largest requested timeframe.
    await this.warmUp(since)
    await this.switchToRealtime()
    this.start()
  }

  start() {
    this.isStarted = true
  }

  stop() {
    this.isStarted = false
  }

  // FLUFF -----------------------------

  /**
   * Return the lastCandle for the current strategy's baseTimeframe
   * @param {String} _tf - (optional) timeframe
   * @param {Number} _n - (optional) index into imd (default: 0)
   * @returns {Array<Number} the last candle
   */
  lastCandle(_tf, _n) {
    const tf = _tf || this.baseTimeframe
    const imd = this.marketState[`imd${tf}`]
    const n = _n || 0
    const candle = [
      imd.timestamp[n],
      imd.open[n],
      imd.high[n],
      imd.low[n],
      imd.close[n],
      imd.volume[n]
    ]
    return candle
  }

  /**
   * An alias for lastCandle
   * @param {String} _tf - (optional) timeframe
   * @param {Number} _n - (optional) index into imd
   * @returns {Array<Number} the last candle
   */
  l(_tf, _n) {
    return this.lastCandle(_tf, _n)
  }

}

/*
   The main difference between trading and testing is where execution happens.
   A Simulator instance may consume price from a real exchange, but execution happens
   on a simulated exchange.  Unfortunately, the function signature for a simulated
   exchange is different from a real exchange in that it needs to be fed candles.
 */
class Simulator extends Trader {
  constructor(opts) {
    super(opts)
    this.orderLog = []
    this.initializeExecutor(opts.balance || 500000)
  }

  name() {
    return 'Simulator'
  }

  initializeExecutor(balance) {
    this.executor = exchanges.simulator.create({balance}) // This is the old style of exchange initialization.
  }

  // Is iteration the same in Trader vs Simulator?  No.
  // Trade execution is synchronous during simulation but async in live trading.
  // The simulator can do everything in one function.
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
      // give orders to exchange simulator to execute
      let candle = this.lastCandle()
      let [exchangeState, executedOrders] = await this.executor(orders, this.exchangeState, candle); // this.executor in simulator vs this.driver.execute in trader
      this.exchangeState = exchangeState
      this.executedOrders = executedOrders
      executedOrders.forEach((o) => {
        const rate = o.type === 'market' ? this.exchange.fees.taker : this.exchange.fees.maker
        const line = {
          ts: time.iso(o.timestamp),
          side: o.action,
          type: o.type,
          symbol: this.opts.market,
          quantity: o.quantity,
          price: o.fillPrice,
          fee: utils.tradingFee(rate, (o.quantity * o.fillPrice), o.fillPrice)
        }
        line.fee$ = line.fee * o.fillPrice
        console.log('xo', line)
        this.orderLogger.info(line)
      })
    })
  }
}

const mainnet = {
  bybit: {
    BTCUSD(strategy, options={}) {
      options.key = process.env.TA_BYBIT_API_KEY
      options.secret = process.env.TA_BYBIT_API_SECRET
      options.livenet = true
      return new Trader({ dataDir: 'data', logDir: LOG_TRADE, exchange: 'bybit', market: 'BTC/USD', strategy, options })
    },
    ETHUSD(strategy, options={}) {
      options.key = process.env.TA_BYBIT_API_KEY
      options.secret = process.env.TA_BYBIT_API_SECRET
      options.livenet = true
      return new Trader({ dataDir: 'data', logDir: LOG_TRADE, exchange: 'bybit', market: 'ETH/USD', strategy, options })
    }
  }
}

const testnet = {
  bybit: {
    BTCUSD(strategy, options={}) {
      options.key = process.env.TA_BYBIT_API_KEY
      options.secret = process.env.TA_BYBIT_API_SECRET
      options.livenet = false
      return new Trader({ dataDir: 'data', logDir: LOG_TRADE, exchange: 'bybit', market: 'BTC/USD', strategy, options })
    }
  }
}

const simulator = {
  bybit: {
    BTCUSD(strategy, options={}) {
      return new Simulator({ dataDir: 'data', logDir: LOG_LIVETEST, exchange: 'bybit', market: 'BTC/USD', strategy, options })
    },
    ETHUSD(strategy, options={}) {
      return new Simulator({ dataDir: 'data', logDir: LOG_LIVETEST, exchange: 'bybit', market: 'ETH/USD', strategy, options })
    },
  },
  ftx: {
    LINKPERP(strategy, options={}) {
    }
  }
}

module.exports = {
  Trader,
  Simulator,
  mainnet,
  testnet,
  simulator
}

/*

   How do I use this thing?

   // Instantiate a live simulator with a HeikinAshi strategy using 1m candles (for testing)
   s = live.simulator.bybit.BTCUSD(...preset.ha1m)
   since = DateTime.fromISO('2021-03-17')
   s.go(since).then(cl)

   // Let's try on the testnet
   s = live.testnet.bybit.BTCUSD(...preset.ha1m_c)
   since = DateTime.fromISO('2021-05-31')
   s.go(since).then(cl)

 */


