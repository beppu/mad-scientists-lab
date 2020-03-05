/*

  This is the "Hello, World!" of trading algorithms.
  Just buy at the first opportunity and hold.
  If your strategy can't beat buy and hold, you have to try again.

*/

module.exports = function BuyAndHoldFn(baseTimeframe, opts) {
  const indicatorSpecs = {}
  indicatorSpecs[baseTimeframe] = {}
  const imdKey = `imd${baseTimeframe}`
  const buyAndHold = function(state) {
    if (state[imdKey].close.length === 1) {
      return { signal: 'BUY' }
    } else {
      return { signal: undefined }
    }
  }
  return [indicatorSpecs, buyAndHold]
}
