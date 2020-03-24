const utils = require('../utils')

/*
  It's useful to know when a series crosses another series.

  These are further generalized versions of functions that were first written
  for bin/aligned. Instead of taking an InvertedMarketData structure, these
  functions can take individual InvertedSeries found within those structures.
  This moves the responsibility of key lookup to the caller, but that's usually
  fine. It also allows InvertedSeries to exist outside of an InvertedMarketData
  structure which could be useful. Furthermore, it simplifies the comparison
  code dramatically.

 */

/**
 * Is `a` above `b` right now?
 * @param {InvertedSeries} a - a series of numbers
 * @param {InvertedSeries} b - another series of numbers
 * @returns {Boolean} true if a is greater than b at index 0
 */
function crossedUpNow(a, b) {
  return a[0] > b[0]
}

/**
 * Is `a` below `b` right now?
 * @param {InvertedSeries} a - a series of numbers
 * @param {InvertedSeries} b - another series of numbers
 * @returns {Boolean} true if a is less than b at index 0
 */
function crossedDownNow(a, b) {
  return a[0] < b[0]
}

/**
 * Did `a` cross above `b` in the most recent candle?
 * @param {InvertedSeries} a - a series of numbers
 * @param {InvertedSeries} b - another series of numbers
 * @returns {Boolean} true if a crossed above b
 */
function crossedUp(a, b) {
  return a[0] > b[0] && a[1] <= b[1]
}

/**
 * Did `a` cross below `b` in the most recent candle?s
 * @param {InvertedSeries} a - a series of numbers
 * @param {InvertedSeries} b - another series of numbers
 * @returns {Boolean} true if a crossed below b
 */
function crossedDown(a, b) {
  return a[0] < b[0] && a[1] >= b[1]
}

/**
 * Is the most recent value of each series less than the series before it?
 * @param {Array<InvertedSeries>} series - a list of InvertedSeries
 * @returns {Boolean} true if the most recent value of each series decreases in value with each successive series.
 */
function isDescending(series) {
  // Example:
  // sma 50 100 200 is bullish if sma50 > sma100 > sma200 (if they're descending)
  return utils.isDescending(series)
}

/**
 * Is the most recent value of each series greater than the series before it?
 * @param {Array<InvertedSeries>} series - a list of InvertedSeries
 * @returns {Boolean} true if the most recent value of each series increases in value with each successive series.
 */
function isAscending(series) {
  return utils.isAscending(series)
}

/**
 * Did the series become descending in the current candle?
 * @param {Array<InvertedSeries>} series - Parameter description.
 * @returns {Boolean} true if the most recent values in the series is descending but previous set of values is not.
 */
function becameDescending(series) {
  const series1 = series.map((s) => s.slice(1)) // series1 is one candle in the past
  return isDescending(series) && !isDescending(series1)
}

/**
 * Did the series become ascending in the current candle?
 * @param {Array<InvertedSeries>} series - Parameter description.
 * @returns {Boolean} true if the most recent values in the series is ascending but previous set of values is not.
 */
function becameAscending(series) {
  const series1 = series.map((s) => s.slice(1)) // series1 is one candle in the past
  return isAscending(series) && !isAscending(series1)
}

/*

  Fun Fact:

  Crosses can also be detected with the ascending/descending functions by giving
  those functions an Array of 2 InvertedSeries. The cross functions are included
  for readability in the case where only 2 series are being compared. They are
  also more efficient than the generalized ascending/descending functions.

 */

module.exports = {
  crossedUpNow,
  crossedDownNow,
  crossedUp,
  crossedDown,
  isDescending,
  isAscending,
  becameDescending,
  becameAscending,
}
