/*

  This is the "Hello, World!" of trading algorithms.
  Just buy at the first opportunity and hold.
  If your strategy can't beat buy and hold, you have to try again.

*/

module.exports = function init(baseTimeframe, opts) {
  const indicatorSpecs = {}
  indicatorSpecs[baseTimeframe] = []
  const imdKey = `imd${baseTimeframe}`
  let hasBought = false
  function buyAndHold(state, executedOrders) {
    if (!hasBought) {
      const close = state[imdKey].close[0]
      if (!close) return []
      const adjustedClose = close + (close * 0.05) // assume a higher price so that we don't buy more than we can afford on the market buy
      hasBought = true
      return [
        {
          id: 'almost-all-in',
          type: 'market',
          action: 'buy',
          quantity: opts.balance / adjustedClose
        }
      ]
    } else {
      return []
    }
  }
  return [indicatorSpecs, buyAndHold]
}
