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
const pipeline   = require('./pipeline')
const strategies = require('./strategies')
const research   = require('./research')
const exchanges  = require('./exchanges')


class Trader {
  constructor({exchange, market, strategy, logger}) {
    this.opts = { exchange, market, strategy }
    this.logger = logger || pino()
    this.isWarmedUp = false
    this.isRealtime = false
  }
  // XXX - I can't implment a full trader yet.
  // I need exchanges/bybit to implement more of the exchange bits.
  // Position Before Submission

  async warmUp() {
    // This is the same for both.
  }

  async switchToRealtime() {
    // This is the same for both.
  }

  /**
   * Start the strategy
   */
  async start() {
    // Not sure if this will be the same or not.
  }

  async stop() {
  }

  async reset() {
  }

  iterate() {
    // This is not async and I think this is where I'm going to differentiate
    // between live testing and live trading.
  }
}

/*
   The main difference between trading and simulation is where execution happens.
   A Simulator instance may consume price from a real exchange, but execution happens
   on a simulated exchange.  Unfortunately, the function singature for a simulated
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
    BTCUSD(strategy, options) {
    }
  }
}

module.exports = {
  Trader,
  Simulator,
  test,
  trade
}
