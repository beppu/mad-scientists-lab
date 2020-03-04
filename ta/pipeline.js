const Bluebird = require('bluebird')
const fs = Bluebird.promisifyAll(require('fs'))
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

function mergeCandle(lastCandle, candle) {
  const close = candle[4];
  const newCandle = [...lastCandle];
  if (newCandle[2] < close) {
    newCandle[2] = close;
  }
  if (newCandle[3] > close) {
    newCandle[3] = close;
  }
  newCandle[4] = close;
  const newVolume = lastCandle[5] + newCandle[5];
  newCandle[5] = newVolume;
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
  const timeframes = Object.keys(indicatorSpecs)
  timeframes.forEach((tf) => {
    const imdKey  = `imd${tf}`
    const mdKey   = `md${tf}`
    state[mdKey]  = { timestamp: [], open: [], high: [], low: [], close: [], volume: [] } // empty marketData
    state[imdKey] = { timestamp: [], open: [], high: [], low: [], close: [], volume: [] } // empty invertedMarketData

    const indicatorsKey = `indicators${tf}`
    state[indicatorsKey] = []
    indicatorSpecs[tf].forEach((spec) => {
      const [name, ...params] = spec
      state[indicatorsKey].push(indicators[name](...params))
    })
  })
  return function(candle) {
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
