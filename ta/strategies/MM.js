const clone    = require('clone')
const uuid     = require('uuid')
const outdent  = require('outdent')
const time     = require('../time')
const utils    = require('../utils')
const {candles, divergence} = require('../analysis')
const ha       = candles.ha

const marketStrategy = require('./marketStrategy')

const defaultSpecs = (config) => {
  const {highTf, trendTf} = config
  const specs = {}
  specs[highTf] = [ ['heikinAshi'], ['bbands'], ['obv', 'doji'] ]
  specs[trendTf] = [ ['heikinAshi'], ['bbands'], ['hma', 330], ['hma', 440], ['rsi'] ]
  return specs
}

const defaultConfig = {
  highTf:            '1d',
  trendTf:           '4h',    // higher timeframe used for trend determination
  entryTf:           '1m',    // lower timeframe used for entry decisions
  sizeMode:          'spot',
  fixedPositionSize: 1
}

function bbandBounceTop(imd) {
  const end = imd.upperBand.length
  let i = 0
  while (i < end) {
    if (imd.haHigh[i] <= imd.upperBand[i]) return i
    i++
  }
  return -1 // Didn't have enough data to bounce.
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

const rsiDivConfig = {
  indicator: 'rsi',
  ageThreshold: 3,
  gapThreshold: [7, 30],
  peakThreshold: 9
}

/**
 * Have these two series crossed up within the given window
 * @param {InvertedSeries} a - the base series
 * @param {InvertedSeries} b - the series that crosses up over a
 */
function crossedUp(a, b, i=0) {
  return b[i] > a[i]
}

function crossedDown(a, b, i=0) {
  return crossedUp(b, a, i)
}

/**
 * Smart Money is when volume is increasing over N candles
 * @param {InvertedSeries} imd - any inverted market data
 * @param {InvertedSeries} window - how many candles to look-behind for trend
 */
function isSmartMoney(imd, window=5) {
  for (let i = 0; i < window; i++)
    if (imd.volume[i] < imd.volume[i + 1]) return false
  return true
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
  const lastBounce = bbandBounceBottom(imdh)
  console.log('crossed up + bband bounce', crossedUp(imdt.hma330, imdt.hma440), bbandBounceBottom(imdh))
  if (lastBounce > 0 && lastBounce < 10) {
    const haClose = imdt.haClose[0]
    //console.log('bbandBounce', { haClose, hma330: imdt.hma330[0], hma440: imdt.hma440[0] })
    //if (imdt.hma330[0] > imdt.hma440[0] && imdt.hma330[0] < haClose && imdt.hma440[0] < haClose) {
    if (crossedUp(imdt.hma440, imdt.hma330) && bbandBounceBottom(imdh)) {
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
  const imdh = marketState[`imd${config.highTf}`]
  const imdt = marketState[`imd${config.trendTf}`]
  if (imdt.hma330[0] < imdt.hma440[0]) {
    // hma has crossed, so--
    const lastBounce = bbandBounceTop(imdh)
    if (lastBounce > 0 && lastBounce < 5) {
      // we bounced off the top band, so--
      // TODO maybe this could become part of a confidence factor
      console.log('!!!!!!!!! BBAND BOUNCE')
    }
    return true
  }
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
  if (imdt.hma330[0] < imdt.hma440[0]) {
    if (imdt.upperBand[0] <= imdt.haHigh[0]) {
      return true
    }
  }
  return false
}

function shouldCloseLong(marketState, config) {
  return shouldTakeProfit(marketState, config, 'red')
}

function shouldCloseShort(marketState, config) {
  const imdh = marketState[`imd${config.highTf}`]
  const imdt = marketState[`imd${config.trendTf}`]
  if (imdt.hma330[0] > imdt.hma440[0]) {
    if (imdh.lowerBand[0] >= imdh.haLow[0]) {
      return true
    }
  }
  return false
}

const delta = 0.05

function getLongStopPrice(marketState, config) {
  const imdh = marketState[`imd${config.highTf}`]
  return imdh.lowerBand[0] - (imdh.lowerBand[0] * delta)
}

function getShortStopPrice(marketState, config) {
  const imdh = marketState[`imd${config.highTf}`]
  return imdh.upperBand[0] + (imdh.upperBand[0] * delta)
}

const gnuplot = outdent`
set title "MM - Generalized State Machine"
set grid
set xdata time
set xtics scale 5,1 format "%F\\n%T" rotate
set timefmt "%Y-%m-%dT%H:%M:%S"
set y2tics
set boxwidth 0.7 relative
plot [][{{low}}:{{high}}] "{{config.trendTf}}.data" skip {{skip}} using 1:7:8:9:10 title "BTC/USD Heikin Ashi" with candlesticks, \\
  "" skip 0 using 1:15 title "HMA 330" with line lw 3 lc rgb "#26c6da",  \\
  "" skip 0 using 1:16 title "HMA 440" with line lw 3 lc rgb "#64b5f6",  \\
  "" skip 0 using 1:12 title "4h upper band" with line lw 3 lc rgb "#4c51da", \\
  "1d.data" skip 0 using 1:12 title "1d upper band" with line lw 3 lc rgb "purple", \\
  "1d.data" skip 0 using 1:14 title "1d lower band" with line lw 3 lc rgb "purple", \\
  "orders.data" using 1:2:(stringcolumn(4) eq "buy" ? 9 : 11) title "Orders" with points pointsize 3 pt var lc rgb "orange", \\
  "pnl.data" using 1:2 axes x1y2 title "Equity" with line lw 3 lc rgb "green"
`

// This is using the marketOrderStrategy
module.exports = marketStrategy.create({
  defaultSpecs,
  defaultConfig,
  allowedToLong,
  allowedToShort,
  shouldCloseLong,
  shouldCloseShort,
  getLongStopPrice,
  getShortStopPrice,
  gnuplot
})
