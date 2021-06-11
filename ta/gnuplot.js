/*

  This is where I write code for generating data to be fed into gnuplot.

  - I want a function for generating candle data for gnuplot.
    + It should probably take an IMD as input.
  - I want a function that generating data for various indicators.
    + moving averages and other lines should be straightforward.
    + bollinger bands need some way to fill the inside.

 */

const ta = require('./index')
const pipeline = require('./pipeline')
const time = require('./time')
const {DateTime} = require('luxon')

function findFullKeysIndex(imd) {
  const lengths = Object.keys(imd).map((key) => imd[key].length)
  const shortest = Math.min(...lengths)
  return shortest - 1
}

function writeCandles(imd, outputStream, begin, end=0) {
  const keys = Object.keys(imd)
  const realBegin = begin ? begin : findFullKeysIndex(imd)
  // header
  outputStream.write(`# ${keys.map((key, index) => `${index+1}:${key}`).join(', ')}\n`)
  // data
  let i = realBegin
  while (i >= end) {
    //console.log({i}, imd.timestamp[i])
    keys.forEach((k) => {
      if (k === 'timestamp') {
        const ts = time.isoUTC(imd.timestamp[i]).replace(/\.000Z/, '')
        outputStream.write(`${ts} `)
      } else {
        outputStream.write(`${imd[k][i]} `)
      }
    })
    outputStream.write("\n")
    i--
  }
  out.end()
}

// How to write files in node.js using streams.
// https://stackoverflow.com/questions/30734373/writing-long-strings-to-file-node-js

module.exports = {
  findFullKeysIndex,
  writeCandles
}


/*

  # REPL Session

  // Create imd to feed to writePlotData
  candles = await pipeline.loadCandlesFromFS('data', 'bybit', 'BTC/USD', '1m', DateTime.fromISO('2021-01-01', { zone: 'utc' }))
  specs = { '1d': [ ['sma', 20 ] ] }
  loop = pipeline.mainLoopFn('1m', specs)
  state = await pipeline.runLoop(loop, candles)

  // Write out an imd in gnuplot format.
  out = fs.createWriteStream('btcusd')
  gnuplot.writeCandles(state.imd1d, out)

 */
