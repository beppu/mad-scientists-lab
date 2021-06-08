const assert     = require('assert')
const Bluebird   = require('bluebird')
const fs         = Bluebird.promisifyAll(require('fs'))
const kindOf     = require('kind-of')
const uniq       = require('lodash.uniq')
const sortBy     = require('lodash.sortby')
const luxon      = require('luxon')
const ta         = require('./index')
const time       = require('./time')
const utils      = require('./utils')
const indicators = require('./indicators')

const {DateTime} = luxon

/**
 * Load all candles from a JSON file.
 * @param {String} filename - JSON file to load
 * @returns {Array<Candle>} an array of OHLCV candles
 */
async function loadOHLCV(filename) {
  const buffer = await fs.readFileAsync(filename)
  const ohlcv = JSON.parse(buffer.toString())
  return ohlcv
}

/**
 * Return only the filenames of the JSON files we want to process
 * @param {Array<String>} filenames - list of filenames
 * @param {DateTime} start - candlestick timestamp we want to start processing at
 * @returns {Return Type} a list of filenames where the first file should contain the candle with the desired `start` time.
 */
function _cleanCandleFilenames(filenames, start) {
  const s = start ? start.toMillis() : undefined
  const onlyOurs = filenames.filter((fn) => {
    let front = fn.replace(/\.json$/, '')
    return front.match(/^\d+$/)
  })
  const f = sortBy(onlyOurs, (fn) => utils.parseIntB10(fn.replace(/\.json$/, '')))
  const ints = f.map((fn) => utils.parseIntB10(fn.replace(/\.json$/, '')))
  let i = 0, done = false, found = false
  if (!s) return f

  // If we have a start time, look for the file that contains it.
  while (!done) {
    if (ints[i] <= s && s < (ints[i+1] || Infinity)) {
      done = true
      found = true
    } else {
      i++
      if (i === ints.length) {
        done = true // but not found
      }
    }
  }
  if (found) {
    return f.slice(i)
  } else {
    return []
  }
}

/**
 * Return an iterator function that returns the next candle.
 * GOTCHA:  The first candle is often earlier than the given start time.
 *          The first candle is the first candle in the file that contains the candle
 *          nearest to the given start time.
 * @param {String} dataDir - directory where OHLCV candlestick data is organized
 * @param {String} exchange - exchange name
 * @param {String} market - market symbol
 * @param {String} timeframe - timeframe of candles to load
 * @param {DateTime} start - earliest allowed DateTime for first candle
 * @returns {Function} a function that returns the next candle
 */
async function loadCandlesFromFS(dataDir, exchange, market, timeframe, start) {
  const path = utils.dataPath(dataDir, exchange, market, timeframe)
  const _jsons = await fs.readdirAsync(path)
  const jsons = _cleanCandleFilenames(_jsons, start)
  let i = 0 // filename index
  let j = 0 // candle index
  let ohlcv = await loadOHLCV(`${path}/${jsons[i]}`)
  return async function nextCandle() {
    if (!ohlcv) return undefined
    const candle = ohlcv[j++]
    //console.log({i,j})
    if (j == ohlcv.length) {
      i++
      j = 0
      //console.log(`${path}/${jsons[i]}`, i)
      if (i == jsons.length) {
        // special case to end iteration
        ohlcv = undefined
      } else {
        ohlcv = await loadOHLCV(`${path}/${jsons[i]}`)
      }
    }
    return candle
  }
}

/**
 * Return the leading timestamp of the last batch of candles downloaded to the filesystem.
 * @param {String} dataDir - directory where OHLCV candlestick data is organized
 * @param {String} exchange - exchange name
 * @param {String} market - market symbol
 * @param {String} timeframe - timeframe of candles to load
 */
async function lastTimestampFromFS(dataDir, exchange, market, timeframe) {
  const path = utils.dataPath(dataDir, exchange, market, timeframe)
  const _jsons = await fs.readdirAsync(path)
  const jsons = _cleanCandleFilenames(_jsons, undefined)
  if (jsons.length) {
    const lastFilename = jsons[jsons.length - 1]
    const lastTimestamp = utils.parseIntB10(lastFilename.replace(/\.json$/, ''))
    return lastTimestamp
  } else {
    return 1000
  }
}

/**
 * This function leaves timestamp and open alone, but updates high, low, close and volume as necessary.
 * @param {Array<Number>} lastCandle - the previous candle
 * @param {Array<Number>} candle - the current candle
 * @returns {Array<Number>} a merged candle
 */
function mergeCandle(lastCandle, candle) {
  // This function is used during aggregation to make bigger candles out of smaller ones.
  const newCandle = [
    lastCandle[0],  // timestamp
    lastCandle[1],  // open
    0,              // high
    0,              // low
    candle[4],      // close
    lastCandle[5] + candle[5] // volume
  ]
  if (typeof lastCandle[1] === 'undefined') {
    // special case for the very first candle
    newCandle[1] = candle[1] // open
    newCandle[2] = candle[2] // high
    newCandle[3] = candle[3] // low
  } else {
    newCandle[2] = lastCandle[2] > candle[2] ? lastCandle[2] : candle[2]
    newCandle[3] = lastCandle[3] < candle[3] ? lastCandle[3] : candle[3]
  }
  return newCandle;
}

/**
 * This function will return another function that builds higher timeframe candles out of lower timeframe candles.
 * @param {String} desiredTimeframe - a timeframe specificaiton
 * @returns {Function} a function that takes lower timeframe candles and returns an aggregated candle
 */
function aggregatorFn(desiredTimeframe) {
  let ax = [0, undefined, undefined, undefined, undefined, 0]
  // candle is assumed to come from a timeframe that's smaller and evenly divisible by desiredTimeframe
  return function(candle) {
    // check to see if we're on timeframe boundary
    // if so, reset ax and start a new candle
    // else update ax's ohlcv values and return it
    const ts = time.timestampForTimeframe(desiredTimeframe, candle[0])
    if (time.isTimeframeBoundary(desiredTimeframe, DateTime.fromMillis(candle[0]))) {
      ax = [ ...candle ]
      return [candle, true]
    } else {
      ax = mergeCandle(ax, candle)
      ax[0] = ts
      return [ax, false]
    }
  }
}

/**
 * Return a pristine InvertedSeries
 * @returns {InvertedSeries} a new InvertedSeries object
 */
function s() { return ta.createInvertedSeries() }

/**
 * Return a loop function that consumes candles and updates indicators
 * @param {String} baseTimeframe - the timeframe of the candles being fed into the loop
 * @param {IndicatorSpec} indicatorSpecs - Parameter description.
 * @returns {Function} Return description.
 */
function mainLoopFn(baseTimeframe, indicatorSpecs) {

  // Check for the inverted flag.
  const inverted = indicatorSpecs.inverted
  delete indicatorSpecs.inverted
  // Automatically insert an empty baseTimeframe if no indicators for baseTimeframe exist.
  if (!indicatorSpecs[baseTimeframe]) {
    indicatorSpecs[baseTimeframe] = []
  }

  const state = {
    baseTimeframe
  }
  const timeframes = uniq([baseTimeframe].concat(Object.keys(indicatorSpecs)))
  timeframes.forEach((tf) => {
    const imdKey  = `imd${tf}`
    const mdKey   = `md${tf}`
    state[mdKey]  = { timestamp: [], open: [], high: [], low: [], close: [], volume: [] } // empty marketData
    state[imdKey] = inverted
      ? { timestamp: s(), open: s(), high: s(), low: s(), close: s(), volume: s() }
      : { timestamp: [],  open: [],  high: [],  low: [],  close: [],  volume: []  } // empty invertedMarketData

    const indicatorsKey = `indicators${tf}`
    state[indicatorsKey] = []
    const iSpecs = indicatorSpecs[tf]
    if (iSpecs) {
      iSpecs.forEach((spec) => {
        const [name, ...params] = spec
        state[indicatorsKey].push(indicators[name](...params))
      })
    }

    const aggregatorKey = `aggregator${tf}`
    if (baseTimeframe === tf) {
      state[aggregatorKey] = undefined
    } else {
      state[aggregatorKey] = aggregatorFn(tf)
    }
  })
  const baseImd = state[`imd${baseTimeframe}`]

  return function mainLoop(candle, debug=false) {
    if (baseImd.timestamp[0] && baseImd.timestamp[0] > candle[0]) {
      // refuse to take candles in the past and return state immediately
      //console.warn(time.iso(candle[0]), candle)
      return state
    }
    timeframes.forEach((tf) => {
      const imdKey  = `imd${tf}`
      const mdKey   = `md${tf}`
      const imd = state[imdKey]
      const md = state[mdKey]

      const aggregatorKey = `aggregator${tf}`
      const aggregator = state[aggregatorKey]
      const [candleForTf, isBoundaryForTf] = aggregator ? aggregator(candle) : [candle, true]

      if (isBoundaryForTf) {
        // Check the timestamp of the last candle and only append if the timestamp is different.
        if (candleForTf[0] !== imd.timestamp[0]) {
          ta.marketDataAppendCandle(md, candleForTf)
          ta.invertedAppendCandle(imd, candleForTf)
        } else {
          ta.marketDataUpdateCandle(md, candleForTf)
          ta.invertedUpdateCandle(imd, candleForTf)
        }
      } else {
        ta.marketDataUpdateCandle(md, candleForTf)
        ta.invertedUpdateCandle(imd, candleForTf)
      }

      const indicatorsKey = `indicators${tf}`
      //                             0       1       2    3              4
      state[indicatorsKey].forEach(([insert, update, key, previousState, currentState], i) => {
        // insert        => insert function
        // update        => update function
        // key           => name(s) of indicator value(s) in invertedMarketData structure
        // previousState => I believe this is the state used to generate the most recent insert
        // currentState  => I believe this is the state that should eventually be used to generate the next insert
        if (isBoundaryForTf) {
          if (debug) console.log('insert')
          let k, kind
          if (kindOf(key) === 'array') {
            kind = 'array'
            k = key[0]
          } else {
            k = key
          }

          // For timeframes that are aggregated (meaning they have to use the update function),
          // the first iteration that generates a value has to be fixed,
          // because update cannot be called with an undefined state
          // like insert can.
          // (What I don't get is the lack of state.  Doesn't the first insert create state?  As long as you insert first, you should be fine.)
          let indicatorState
          if (imd[k] && imd[k].length === 1) { // XXX FIND A BETTER WAY!!!!
            // fix the first value
            // -clone and rewind md and imd
            let md2 = ta._previousMd(md)
            let imd2 = ta._previousImd(imd)
            // -recalculate....
            let fixedState = insert(md2, imd2, undefined)
            // -replace broken values
            if (kind === 'array') {
              let fixedValues = key.map((name) => imd2[name][0])
              key.forEach((name, i) => imd[name][0] = fixedValues[i])
            } else {
              let fixedValue = imd2[k][0]
              imd[k][0] = fixedValue
            }
            indicatorState = fixedState
            //console.log('fix', fixedState)
            state[indicatorsKey][i][3] = fixedState
          } else {
            // On a normal iteration, currentState gets promoted to previousState on timeframe boundaries.
            indicatorState = currentState
            state[indicatorsKey][i][3] = currentState
          }

          // when inserting, use the last updateState to start the new candle
          // however, if we're aggregating, we need to wait until the last partial candle and do a full insertion
          // it would be nice if the very first insertion didn't need a special case.
          if (debug) {
            console.log('imd.timestamp[0] === candle[0]', imd.timestamp[0] === candle[0])
            console.log('(currentState && currentState.timestamp == candle[0])', (currentState && currentState.timestamp == candle[0]))
            console.log('(imd[k] && imd[k].length > 0)', (imd[k] && imd[k].length > 0))
          }
          if (imd.timestamp[0] === candle[0] && (currentState && currentState.timestamp == candle[0]) && (imd[k] && imd[k].length > 0)) {
            if (debug) console.log('I should replace here.', previousState)
            if (kind === 'array') {
              key.forEach((name) => imd[name].shift())
            } else {
              imd[k].shift()
            }
            state[indicatorsKey][i][4] = insert(md, imd, previousState)
          } else {
            state[indicatorsKey][i][4] = insert(md, imd, indicatorState)
          }
        } else {
          if (debug) console.log('update')
          // when updating, repeatedly use the last known insertState as the base
          // however, i need a special case when we're updating the very first value.
          // - I don't know if the first value can be created with a partial insert and update.
          // - I think the first value can only be inserted correctly with a full candle
          state[indicatorsKey][i][4] = update(md, imd, previousState)
        }
      })
    })
    return state
  }
}

/**
 * Run a loop function to completion and return marketState
 * @param {Function} loop - a main loop function created by pipeline.mainLoopFn
 * @param {Function} nextCandle - an async function that returns the next candle
 * @returns {MarketData} marketData as computed by `loop` over all the candles returned by `nextCandle`
 */
async function runLoop(loop, nextCandle) {
  let candle = await nextCandle()
  let marketState
  while (candle) {
    marketState = loop(candle)
    candle = await nextCandle()
  }
  return marketState
}

/**
 * Make sure candles in the stream have the expected progression of timestamps for the given timeframe
 * @param {String} timeframe - duration of the candles
 * @param {Function} nextCandle - an async function that returns the next candle
 * @returns {Object} report on findings
 */
async function validateNextCandles(timeframe, nextCandle) {
  const findings = {}
  // TODO - This is a data sanitation check that would be nice to have, but I could probably get away
  // with not checking this.
  return findings
}

/**
 * Aggregate an array of candles.
 * @param {String} timeframe - timeframe to convert candles to
 * @param {Array<Array<Number>>} candles - an array of candles in a smaller timeframe that the given timeframe
 * @returns {Array<Array<Number>>} an aggregated array of candles
 */
function aggregateCandles(timeframe, candles) {
  // TODO Expose aggregatorFn in a functional and easy-to-use way.
  // It's useful for debugging in the REPL.
  const results = []
  return results
}

// What's a nice API for declaring that I want stuff calculdated on various timeframes
/*

  // keep in mind, strategies should be composable
  // I want microstrategies for buying and selling
  // This is tricky.
  // I'm going to have to standardize the indicator calling conventions.
  // I may have to differentiate between things that add values to invertedMarketData versus
  //   things that derive meaning from invertedMarketData.
  // EMA 50 and EMA 100 are indicators that add values to invertedMarketData.
  // alignment is something that detects a relation between MAs
  // The various detectors in bin/
  // - aligned
  // - horizontal
  // - price (ema, sma)
  // - guppy
  // - divergence
  // These detectors depend on indicators, but they're not necessarily indicators themselves.
  // Should they be?
  // Should they add data to invertedMarketData?
  // They are complex indicators that might not necessarily generate new data on every candle.
  // 1d bullish divergence only happens every few months


  const p = new Pipeline({
    '12h': [['bbands'], ['rsi'], ['ema', 50], ['ema', 100], ['ema', 200]],
    '1d': [['divergence', 'bullish'], ['divergence', 'bearish']], // could this imply bbands and rsi?
  })

  // p.imd['12h'] and p.imd['1d'] would have those values recalculated on every new candle

  p.pushCandles('5m', candles)

 */

module.exports = {
  loadOHLCV,
  _cleanCandleFilenames,
  loadCandlesFromFS,
  lastTimestampFromFS,
  mergeCandle,
  aggregatorFn,
  mainLoopFn,
  runLoop,
  validateNextCandles,
  aggregateCandles
}

/*

  // Examples for bin/repl
  // ---------------------

  // Create an iterator
  const start = DateTime.fromISO(' 2017-01-01', { zone: 'utc' })
  //const start = DateTime.fromISO('2017-08-24T17:00:00')
  iterator = await pipeline.loadCandlesFromFS('data', 'bitmex', 'BTC/USD', '1h', start)

  // Fetch next candle
  candle = iterator()

  // Are we on a timeframe boundary?
  time.isTimeframeBoundary('1d', time.dt(1482789600000))

*/
