/**
 * Bring all these together into an object that can be used interactively.
 *
 * - candle consumption (batch and realtime)
 * - candle aggregation
 * - indicator calculation
 * - strategy execution
 * - exchange execution
 */

const pino       = require('pino')
const luxon      = require('luxon')
const ta         = require('./index')
const utils      = require('./utils')
const pipeline   = require('./pipeline')
const strategies = require('./strategies')
const research   = require('./research')
const exchanges  = require('./exchanges')

const {DateTime} = luxon

function findStrategy(name) {
  if (strategies[name]) return strategies[name]
  if (research[name]) return research[name]
  return undefined
}

class Trader {
  constructor({exchange, market, strategy, options, logger}) {
    this.opts = { exchange, market, strategy, options }
    this.logger = logger || pino()
    this.isWarmedUp = false
    this.isRealtime = false
    this.exchange = exchanges[exchange]

    // Instantiate strategy and get its indicatorSpecs
    const _s = findStrategy(strategy)
    if (!_s) throw(`Can't find strategy '${strategy}'`)
    let [indicatorSpecs, s] = _s.init(options)
    this.strategy = s
    this.indicatorSpecs = indicatorSpecs
    // Instantiate a pipeline with the strategy's indicatorSpecs
    this.baseTimeframe = '1m' // XXX It would be nice to not hardcode this, but I almost always want 1m.
    this.mainLoop = pipeline.mainLoopFn(this.baseTimeframe, indicatorSpecs)
  }
  // XXX - I can't implment a full trader yet.
  // I need exchanges/bybit to implement more of the exchange bits.
  // Position Before Submission

  async sanityCheck() {
    // TODO - Make sure we have some data in the FS first
    return true
  }

  async warmUp(start = 0) {
    await this.sanityCheck()
    // This is the same for both.
    // Load candles from the filesystem until we can't.
    const nextCandle = pipeline.loadCandlesFromFS(this.opts.exchange, this.opts.market, this.baseTimeframe, start)
    let candle = await nextCandle()
    while (candle) {
      this.marketState = this.mainLoop(candle)
      candle = await nextCandle()
    }
    // Get websockets started in the background so switching can be seemless later.
    const [ws, events] = this.exchange.connect(undefined) // XXX undefined should be an API key
    this.ws = ws
    this.events = events
    this.candleChannel = await this.exchange.subscribeCandles(this.ws, this.opts.market)
    // Load from memory one last time if necessary.
    /*
      TODO - This is the part I hate.
      Loading up 1m candles from the beginning of an exchange's trading history can
      take considerably longer than 1m.  Furthermore, I don't have any guarantee that
      the FS has enough data downloaded.

      Once I get to the end of what the FS has, I have to fill the gap in time from
      the end of the FS to the current minute, and for ByBit, it can't be more than
      200 minutes.  For BitMEX, it can't be more than 1000 minutes.
     */
    // let lastTimestamp = this.marketState.imd1m.timestamp[0]
    // let candles = await ta.loadCandles(this.opts.exchange, this.opts.market, this.baseTimeframe, lastTimestamp)
    /*
      TODO - give ta.loadCandles a limit parameter
      TODO - store exchange limits in exchanges/$exchange.js
     */
    // candles.forEach((c) => this.marketState = this.mainLoop(candle))
    this.isWarmedUp = true
  }

  async switchToRealtime() {
    // This is the same for both.
    if (this.isWarmedUp) {
      this.events.on(this.candleChannel, (candle) => {
        this.marketState = this.mainLoop(candle)
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
    // That should keep going until the trader instance is no longer being used.
  }

  async reset() {
    // Reset the strategy to its initial state.
  }

  async go() {
    await this.warmUp()
    await this.switchToRealtime()
    await this.start()
  }

  iterate() {
    // This is not async and I think this is where I'm going to differentiate
    // between live testing and live trading.
  }
}

/*
   The main difference between trading and simulation is where execution happens.
   A Simulator instance may consume price from a real exchange, but execution happens
   on a simulated exchange.  Unfortunately, the function signature for a simulated
   exchange is different from a real exchange in that it needs to be fed candles.
 */
class Simulator extends Trader {

  iterate() {
  }
}

const trade = {
  bybit: {}
}

const test = {
  bybit: {
    BTCUSD(strategy, options={}) {
      return new Trader({ exchange: 'bybit', market: 'BTC/USD', strategy, options })
    }
  }
}

const btc = test.bybit.BTCUSD

module.exports = {
  Trader,
  Simulator,
  test,
  trade,
  btc
}
