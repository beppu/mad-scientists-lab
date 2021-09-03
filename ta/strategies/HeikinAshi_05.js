const clone    = require('clone')
const uuid     = require('uuid')
const analysis = require('../analysis')
const ha       = analysis.candles.ha
const time     = require('../time')
const utils    = require('../utils')

const marketStrategy = require('./marketStrategy')

const defaultConfig = {
  trendTf:           '30m',    // higher timeframe used for trend determination
  entryTf:           '1m',     // lower timeframe used for entry decisions
  sizeMode:          'spot',
  fixedPositionSize: 1
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

const defaultSpecs = [ ['heikinAshi'], ['hma', 55], [ 'bbands' ] ]

// This is using the marketOrderStrategy
module.exports = marketStrategy.create({
  defaultSpecs,
  defaultConfig,
  allowedToLong,
  allowedToShort,
  shouldTakeProfit
})
