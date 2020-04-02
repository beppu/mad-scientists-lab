const Bluebird   = require('bluebird')
const fs         = Bluebird.promisifyAll(require('fs'))
const kindOf     = require('kind-of')
const uniq       = require('lodash.uniq')
const sortBy     = require('lodash.sortby')
const ta         = require('./index')
const time       = require('./time')
const utils      = require('./utils')
const indicators = require('./indicators')

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
 * Return an iterator function that returns the next candle
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
  return async function () {
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
  newCandle[2] = lastCandle[2] > candle[2] ? lastCandle[2] : candle[2]
  newCandle[3] = lastCandle[3] < candle[3] ? lastCandle[3] : candle[3]
  return newCandle;
}

/**
 * This function will return another function that builds higher timeframe candles out of lower timeframe candles.
 * @param {String} desiredTimeframe - a timeframe specificaiton
 * @returns {Function} a function that takes lower timeframe candles and returns an aggregated candle
 */
function aggregatorFn(desiredTimeframe) {
  let ax = [0, 0, 0, 0, 0]
  // candle is assumed to come from a timeframe that's smaller and evenly divisible by desiredTimeframe
  return function(candle) {
    // check to see if we're on timeframe boundary
    // if so, reset ax and start a new candle
    // else update ax's ohlcv values and return it
    const ts = time.timestampForTimeframe(desiredTimeframe, candle[0])
    if (candle[0] === ts) {
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

  return function(candle) {
    timeframes.forEach((tf) => {
      const imdKey  = `imd${tf}`
      const mdKey   = `md${tf}`
      const imd = state[imdKey]
      const md = state[mdKey]

      const aggregatorKey = `aggregator${tf}`
      const aggregator = state[aggregatorKey]
      const [candleForTf, isBoundaryForTf] = aggregator ? aggregator(candle) : [candle, true]

      if (isBoundaryForTf) {
        ta.marketDataAppendCandle(md, candleForTf)
        ta.invertedAppendCandle(imd, candleForTf)
        //if (tf == '2h') console.log(imd.open[0], md.open[md.open.length - 1], imd.open[0] == md.open[md.open.length - 1])
      } else {
        ta.marketDataUpdateCandle(md, candleForTf)
        ta.invertedUpdateCandle(imd, candleForTf)
      }

      const indicatorsKey = `indicators${tf}`
      state[indicatorsKey].forEach(([insert, update, key, previousState, currentState], i) => {
        if (isBoundaryForTf) {
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
          let indicatorState
          if (imd[k] && imd[k].length === 1) {
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
          state[indicatorsKey][i][4] = insert(md, imd, indicatorState)
          //console.log('insert', indicatorState, '=>', state[indicatorsKey][i][4], imd.close[0])
        } else {
          // when updating, repeatedly use the last known insertState as the base
          // however, i need a special case when we're updating the very first value.
          // - I don't know if the first value can be created with a partial insert and update.
          // - I think the first value can only be inserted correctly with a full candle
          const indicatorState = previousState
          state[indicatorsKey][i][4] = update(md, imd, indicatorState)
          //console.warn('update', indicatorState, '=>', state[indicatorsKey][i][4], imd.close[0])
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
  mergeCandle,
  aggregatorFn,
  mainLoopFn,
  runLoop
}

/*

  // Examples for bin/repl
  // ---------------------

  // Create an iterator
  const start = DateTime.fromISO('2017-01-01', { zone: 'utc' })
  pipeline.loadCandlesFromFS('data', 'bitmex', 'BTC/USD', '1h', start).then((it) => x.it = it)

  // Fetch next candle
  candle = x.it()

  // Are we on a timeframe boundary?
  time.isTimeframeBoundary('1d', time.dt(1482789600000))

*/
