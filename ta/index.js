const ccxt = require('ccxt');

/**
 * Load candlestick data
 * @param {String} exchange  - Parameter description.
 * @param {String} market    - Parameter description.
 * @param {String} timeframe - Parameter description.
 * @returns {Array<Object>}    An array of candles
 */
function loadCandles(exchange, market, timeframe) {
}

/**
 * Given a function
 * @param {Object}        state   - An object with stream data
 * @param {Function}      fn      - A function that takes a series of candles and returns candles that match its inner criteria
 * @returns {Array<Object>}         An array of candles
 */
function scan(state, fn) {
  let results = state.reduce(fn, [])
  return results
}

function compare(state, fn) {
}

module.exports = {
  loadCandles,
  scan
};
