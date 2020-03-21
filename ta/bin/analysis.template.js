#!/usr/bin/env node
const dotenv    = require('dotenv').config()
const pkg       = require('../package.json')
const ta        = require('../index')
const utils     = require('../utils')
const luxon     = require('luxon')
const commander = require('commander')
const talib     = require('talib')
const beautify  = require('json-beautify')

async function main() {
  const program   = new commander.Command();
  program
    .version(pkg.version)
    .description('Does divergence exist?')
    .option('-x, --exchange <NAME>', 'Exchange to pull data from', process.env.TA_EXCHANGE)
    .option('-m, --market <SYMBOL>', 'Market in exchange to pull data from', process.env.TA_MARKET)
    .option('-t, --timeframe <INTERVAL>', 'Candlestick duration for market data', process.env.TA_TIMEFRAME)
    .option('-s, --scan', 'Scan for all occurrences')
    .option('-n, --now', 'Are they aligned now regardless of the past')
  program.parse(process.argv)
  let optionsAreMissing = false;
  ['exchange', 'market', 'timeframe'].forEach((opt) => {
    if (!program[opt]) {
      console.error(`The --${opt} option is required.`)
      optionsAreMissing = true
    }
  })
  if (optionsAreMissing) {
    process.exit(-1)
  }
  try {
    const candles            = await ta.loadCandles(program.exchange, program.market, program.timeframe)
    const marketData         = ta.marketDataFromCandles(candles)
    const invertedMarketData = ta.invertedMarketData(marketData)

    // bollinger bands
    const bbandSettings = ta.id.bbands(marketData)
    const bbands = talib.execute(bbandSettings)
    ta.invertedAppend(invertedMarketData, 'upperBand',  bbands.result.outRealUpperBand)
    ta.invertedAppend(invertedMarketData, 'middleBand', bbands.result.outRealMiddleBand)
    ta.invertedAppend(invertedMarketData, 'lowerBand',  bbands.result.outRealLowerBand)

    // rsi
    const rsiSettings = ta.id.rsi(marketData)
    const rsi = talib.execute(rsiSettings)
    ta.invertedAppend(invertedMarketData, 'rsi', rsi.result.outReal)

    // regular bullish divergence (default)

    if (program.scan) {
    } else if (program.now) {
    } else {
    }
  }
  catch (err) {
    console.error(err.stack)
    process.exit(-1)
  }
}

main()
