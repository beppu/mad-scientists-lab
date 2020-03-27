/*

  This is the "Hello, World!" of trading algorithms.
  Just buy at the first opportunity and hold.
  If your strategy can't beat buy and hold, you have to try again.

*/

const clone = require('clone')

module.exports = function init(baseTimeframe, opts) {
  const indicatorSpecs = {}
  const imdKey = `imd${baseTimeframe}`
  function buyAndHold(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : { hasBought: false }
    if (!state.hasBought) {
      const close = marketState[imdKey].close[0]
      if (!close) return [state, []]
      const adjustedClose = close + (close * 0.05) // assume a higher price so that we don't buy more than we can afford on the market buy
      state.hasBought = true
      return [
        state,
        [
          {
            id: 'almost-all-in',
            type: 'market',
            action: 'buy',
            quantity: opts.balance / adjustedClose
          }
        ]
      ]
    } else {
      return [state, []]
    }
  }
  return [indicatorSpecs, buyAndHold]
}
