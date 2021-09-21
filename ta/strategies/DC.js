/**
 * DC stands for Divergence Confluence.
 * This is the actual strategy I want to write.
 * This is the strategy I've been trading manually and have had the most success with.
 * However, my human weaknesses can make execution difficult at times.
 * I want to encode the best me in this strategy.
 */

const clone          = require('clone')
const outdent        = require('outdent')

const marketStrategy = require('./marketStrategy')
const analysis       = require('../analysis')
const time           = require('../time')

const defaultConfig = {
}

const defaultSpecs = function(config) {
  return {}
}

function allowedToLong(marketState, config, offset=1) {
}

function allowedToShort(marketState, config, offset=1) {
}

function shouldCloseLong(marketState, config, offset=1) {
  // TODO - let the functions for closing longs and closing shorts be independent
}

function shouldCloseShort(marketState, config, offset=1) {
  // TODO - let the functions for closing longs and closing shorts be independent
}

function getStopPrice(marketState, config) {
  // TODO - switch args order so marketState comes first like everything else.
}

const gnuplot = outdent`
set title "DC - Divergence Confluence"
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

module.exports = marketStrategy.create({
  defaultConfig,
  defaultSpecs,
  allowedToLong,
  allowedToShort,
  shouldCloseLong,
  shouldCloseShort,
  getStopPrice
})
