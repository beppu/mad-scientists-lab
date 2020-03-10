const Bluebird = require('bluebird')
const fs = Bluebird.promisifyAll(require('fs'))
const uniq = require('lodash.uniq')
const ta = require('./index')
const time = require('./time')
const utils = require('./utils')
const indicators = require('./indicators')

async function loadOHLCV(filename) {
  const buffer = await fs.readFileAsync(filename)
  const ohlcv = JSON.parse(buffer.toString())
  return ohlcv
}

async function loadCandlesFromFS(dataDir, exchange, market, timeframe) {
  const path = utils.dataPath(dataDir, exchange, market, timeframe)
  const _jsons = await fs.readdirAsync(path)
  const jsons = _jsons // TODO filter and sort for correctness later
  let i = 0
  let j = 0
  let ohlcv = await loadOHLCV(`${path}/${jsons[i]}`)
  return async function () {
    const candle = ohlcv[j++]
    if (j == ohlcv.length) {
      if (i+1 == jsons.length) {
        return null
      }
      i++
      j = 0
      ohlcv = await loadOHLCV(`${path}/${jsons[i]}`)
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
 * Return a loop function that consumes candles and updates indicators
 * @param {String} baseTimeframe - the timeframe of the candles being fed into the loop
 * @param {IndicatorSpec} indicatorSpecs - Parameter description.
 * @returns {Function} Return description.
 */
function mainLoopFn(baseTimeframe, indicatorSpecs) {
  const state = {
    baseTimeframe
  }
  const timeframes = uniq([baseTimeframe].concat(Object.keys(indicatorSpecs)))
  timeframes.forEach((tf) => {
    const imdKey  = `imd${tf}`
    const mdKey   = `md${tf}`
    state[mdKey]  = { timestamp: [], open: [], high: [], low: [], close: [], volume: [] } // empty marketData
    state[imdKey] = { timestamp: [], open: [], high: [], low: [], close: [], volume: [] } // empty invertedMarketData

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

  let lastTimestamp
  return function(candle) {
    if (lastTimestamp === candle[0]) {
      // XXX - Why did I check lastTimestamp here?
    } else {
      timeframes.forEach((tf) => {
        const imdKey  = `imd${tf}`
        const mdKey   = `md${tf}`
        const imd = state[imdKey]
        const md = state[mdKey]

        const aggregatorKey = `aggregator${tf}`
        const aggregator = state[aggregatorKey]
        const [candleForTf, isBoundaryForTf] = aggregator
          ? aggregator(candle)
          : [candle, true]

        if (isBoundaryForTf) {
          ta.marketDataAppendCandle(md, candleForTf)
          ta.invertedAppendCandle(imd, candleForTf)
        } else {
          ta.marketDataUpdateCandle(md, candleForTf)
          ta.invertedUpdateCandle(imd, candleForTf)
        }

        const indicatorsKey = `indicators${tf}`
        state[indicatorsKey].forEach(([insert, update, key, previousState, currentState], i) => {
          if (isBoundaryForTf) {

            // For timeframes that are aggregated (meaning they have to use the update function),
            // the first iteration that generates a value has to be fixed,
            // because update cannot be called with an undefined state
            // like insert can.
            let indicatorState
            if (imd[key] && imd[key].length === 1) {
              // fix the first value
              // -clone and rewind md and imd
              let md2 = ta._previousMd(md)
              let imd2 = ta._previousImd(imd)
              // -recalculate....
              let fixedState = insert(md2, imd2, undefined)
              // -replace broken values
              let fixedValue = imd2[key][0]
              imd[key][0] = fixedValue
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
            // - I think the first value can only be inserted with a full candle
            //const indicatorState = (key && imd[key] && imd[key].length === 1) ? undefined : insertState
            const indicatorState = previousState
            state[indicatorsKey][i][4] = update(md, imd, indicatorState)
            //console.warn('update', indicatorState, '=>', state[indicatorsKey][i][4], imd.close[0])
          }
        })
      })
    }
    return state
  }
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
  loadCandlesFromFS,
  mergeCandle,
  aggregatorFn,
  mainLoopFn,
}
