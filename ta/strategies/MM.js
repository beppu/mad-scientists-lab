const clone    = require('clone')
const uuid     = require('uuid')
const outdent  = require('outdent')
const analysis = require('../analysis')
const ha       = analysis.candles.ha
const time     = require('../time')
const utils    = require('../utils')

const marketStrategy = require('./marketStrategy')

const defaultSpecs = (config) => {
  const {highTf, trendTf} = config
  const specs = {}
  specs[highTf] = [ ['heikinAshi'], ['bbands'] ]
  specs[trendTf] = [ ['heikinAshi'], ['bbands'], ['hma', 330], ['hma', 440] ]
  return specs
}

const defaultConfig = {
  highTf:            '1d',
  trendTf:           '4h',    // higher timeframe used for trend determination
  entryTf:           '1m',    // lower timeframe used for entry decisions
  sizeMode:          'spot',
  fixedPositionSize: 1
}

function bbandBounceBottom(imd) {
  const end = imd.lowerBand.length
  let i = 0
  while (i < end) {
    if (imd.haLow[i] <= imd.lowerBand[i]) return i
    i++
  }
  return -1 // Didn't have enough data to bounce.
}

/**
 * Determine if the strategy is allowed to open a long position.
 * @param {MarketState} marketState - pipeline-generated collection of InvertedMarketData objects
 * @param {Object} config - strategy configuration
 * @param {Number} offset - Number of candles to look back.  (Default: 1)  XXX If you use candleReady to front-run, this needs to be 0
 * @returns {Boolean} true if opening long positions is allowed
 */
function allowedToLong(marketState, config, offset=1) {
  const imdh = marketState[`imd${config.highTf}`]
  const imdt = marketState[`imd${config.trendTf}`]
  if (bbandBounceBottom(imdh) > 0) {
    const haClose = imdt.haClose[0]
    console.log('bbandBounce', { haClose, hma330: imdt.hma330[0], hma440: imdt.hma440[0] })
    if (imdt.hma330[0] < haClose && imdt.hma440[0] < haClose) {
      return true
    }
  }
  return false
}

/**
 * Determine if the strategy is allowed to open a short position.
 * @param {MarketState} marketState - pipeline-generated collection of InvertedMarketData objects
 * @param {Object} config - strategy configuration
 * @param {Number} offset - Number of candles to look back.  (Default: 1)  XXX If you use candleReady to front-run, this needs to be 0
 * @returns {Boolean} true if opening long positions is allowed
 */
function allowedToShort(marketState, config, offset=1) {
  return false
}

/**
 * Determine whether profit should be taken on a position
 * @param {MarketState} marketState - pipeline-generated collection of InvertedMarketData objects
 * @param {Object} config - strategy configuration
 * @param {String} condition - 'red' to close a long position or 'green' to close a short position.
 * @param {Number} offset - Number of candles to look back.  (Default: 1)  XXX If you use candleReady to front-run, this needs to be 0
 */
function shouldTakeProfit(marketState, config, condition, offset=1) {
  const imdh = marketState[`imd${config.highTf}`]
  const imdt = marketState[`imd${config.trendTf}`]
  if (imdt.hma330 < imdt.hma440) {
    if (imdt.upperBand[0] <= imdt.haHigh[0]) {
      return true
    }
  }
  return false
}

function getStopPrice(config, marketState) {
  const imdh = marketState[`imd${config.highTf}`]
  return imdh.lowerBand[0]
}

const gnuplot = outdent`
set title "HeikinAshi 05 - Generalized State Machine"
set grid
set xdata time
set xtics scale 5,1 format "%F\\n%T" rotate
set timefmt "%Y-%m-%dT%H:%M:%S"
set y2tics
set boxwidth 0.7 relative
plot [][{{low}}:{{high}}] "{{config.trendTf}}.data" skip {{skip}} using 1:7:8:9:10 title "BTC/USD Heikin Ashi" with candlesticks, \\
  "" skip 0 using 1:14 title "HMA 330" with line lw 3 lc rgb "#26c6da",  \
  "" skip 0 using 1:15 title "HMA 440" with line lw 3 lc rgb "#64b5f6",  \
  "" skip 0 using 1:11 title "4h upper band" with line lw 3 lc rgb "#4c51da", \
  "1d.data" skip 0 using 1:11 title "1d upper band" with line lw 3 lc rgb "purple", \
  "orders.data" using 1:2:(stringcolumn(4) eq "buy" ? 9 : 11) title "Orders" with points pointsize 3 pt var lc rgb "orange", \\
  "pnl.data" using 1:2 axes x1y2 title "Equity" with line lw 3 lc rgb "green"
`

// This is using the marketOrderStrategy
module.exports = marketStrategy.create({
  defaultSpecs,
  defaultConfig,
  allowedToLong,
  allowedToShort,
  shouldTakeProfit,
  getStopPrice,
  gnuplot
})
