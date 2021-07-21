/*

  Candlestick Analysis

  2021-06-21 Initially, it's doing heikin ashi candles only under candles.ha.* but maybe there will be more in the future.

  */

/*
 * Heikin Ashi candlestick utilities
 */
const ha = {

  /**
   * This is an earlier alternative to isBullish and isBearish that returns 'green' or 'red' instead of boolean values.
   * @param {InvertedMarketData} imd - inverted market data containing heikin ashi candles
   * @param {Number} n - index into imd (default: 0)
   * @returns {String} 'green' for bullish, 'red' for bearish
   */
  color(imd, n=0) {
    return (imd.haOpen[n] < imd.haClose[n]) ? 'green' : 'red'
  },

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
  isIndecisive(imd, n=0) {
    return imd.haHigh[n]  > Math.max(imd.haOpen[n], imd.haClose[n]) &&
           imd.haLow[n] < Math.min(imd.haOpen[n], imd.haClose[n])
  },

  /**
   * Sometimes, candles are just barely indecisive, and we still want to treat
   * them as bullish or bearish candles. This lets us quantify how indecisive a
   * heikin ashi candle is, so that something can decide whether it should be
   * ignored or not.
   * @param {Type of imd} imd - Parameter description.
   * @param {Type of 0} 0 - Parameter description.
   * @param {Type of threshold} ratio - Parameter description.
   */
  howIndecisive(imd, n=0) {
    /*
     * How do we quantify "enough"?
     * The length of both wicks should be taken into consideration.
     */
    const isBullish = ha.isBullish(imd, n)
    const topWick = isBullish
      ? imd.haHigh[n] - imd.haClose[n]
      : imd.haHigh[n] - imd.haOpen[n]
    const bottomWick = isBullish
      ? imd.haOpen[n] - imd.haLow[n]
      : imd.haClose[n] - imd.haLow[n]
    const body = isBullish
      ? imd.haClose[n] - imd.haOpen[n]
      : imd.haOpen[n] - imd.haClose[n]
  }

}

module.exports = {
  ha
}
