const ccxt = require('ccxt')
const talib = require('talib')

/**
 * Load candlestick data
 * @param {String} exchange  - Name of exchange
 * @param {String} market    - Symbol for market
 * @param {String} timeframe - Duration of candle (5m, 30m, 1h, 1d, etc)
 * @returns {Array<Object>}  - An array of candles
 */
async function loadCandles(exchange, market, timeframe) {
  console.log(exchange, ccxt[exchange])
  const ex = new ccxt[exchange]()
  const candles = await ex.fetchOHLCV(market, timeframe, undefined)
  return candles
}


/**
 * Transform candles from ccxt into marketData that talib can analyze.
 * @param {Array<Object>} candles - An array of candles
 * @returns {Object<Array<Number>>} - An object that has arrays for open, high, low, close and volume
 */
function marketDataFromCandles(candles) {
  const initial = { open: [], high: [], low: [], close: [], volume: [] }
  const marketData = candles.reduce(((m, a) => {
    m.open.push(a[1])
    m.high.push(a[2])
    m.low.push(a[3])
    m.close.push(a[4])
    m.volume.push(a[5])
    return m
  }), initial)
  return marketData
}

/**
 * Given a function
 * @param {Object}        state   - An object with stream data
 * @param {Function}      fn      - A function that takes a series of candles and returns candles that match its inner criteria
 * @returns {Array<Object>}       - An array of candles
 */
function scan(state, fn) {
  let results = state.reduce(fn, [])
  return results
}

function compare(state, fn) {
}

// i for indicator
const i = {
  sma: function(marketData, period) {
    return {
      name: 'SMA',
      startIdx: 0,
      endIdx: marketData.close.length - 1,
      inReal: marketData.close,
      optInTimePeriod: period
    }
  }
}

module.exports = {
  loadCandles,
  marketDataFromCandles,
  scan,
  i
};

/*
  Examples:
  $ bin/repl

  candles = await ta.loadCandles('binance', 'BTC/USDT', '5m')
  marketData = ta.marketDataFromCandles(candles)
  talib.execute(ta.i.sma(marketData, 200))
*/
