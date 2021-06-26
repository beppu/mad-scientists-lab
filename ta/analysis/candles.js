/*

  Candlestick Analysis

  2021-06-21 Initially, it's doing heikin ashi candles only under candles.ha.* but maybe there will be more in the future.

  */

/*
 * Heikin Ashi candlestick utilities
 */
const ha = {

  /**
   * Is the current heikin ashi candle bullish?
   * @param {InvertedMarketData} imd - inverted market data containing heikin ashi candles
   * @param {Number} n - index into imd (default: 0)
   * @returns {Boolean} Return description.
   */
  isBullish(imd, n=0) {
    return imd.haOpen[n] < imd.haClose[n]
  },

  /**
   * Is the current heikin ashi candle bearish?
   * @param {InvertedMarketData} imd - inverted market data containing heikin ashi candles
   * @param {Number} n - index into imd (default: 0)
   * @returns {Boolean} Return description.
   */
  isBearish(imd, n=0) {
    return imd.haOpen[n] > imd.haClose[n]
  },

  /**
   * Is the current heikin ashi candle neutral?  (rare)
   * @param {InvertedMarketData} imd - inverted market data containing heikin ashi candles
   * @param {Number} n - index into imd (default: 0)
   * @returns {Boolean} Return description.
   */
  isNeutral(imd, n=0) {
    return imd.haOpen[n] === imd.haClose[n]
  },

  /**
   * Is the current heikin ashi candle indecisive, meaning it has wicks on top and bottom?
   * @param {InvertedMarketData} imd - inverted market data containing heikin ashi candles
   * @param {Number} n - index into imd (default: 0)
   * @returns {Boolean} Return description.
   */
  isIndecision(imd, n=0) {
    return imd.haHigh[n]  > Math.max(imd.haOpen[n], imd.haClose[n]) &&
           imd.haClose[n] < Math.min(imd.haOpen[n], imd.haClose[n])
  }
}

module.exports = {
  ha
}
