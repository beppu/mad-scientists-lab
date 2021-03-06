/*

  This is intended to be a strategy that uses a single moving average as
  support and resistance, and tries to long and short against it.

  Human-readable Rules:

  If position is 0
    If price crosses above a moving average, long
    If price crosses below a moving average, short
  Else
    // I already feel bad for implementing a garbage strategy even if it's just for educational purposes.
    // Could I write a good strategy that is also simple and educational?
    // There was a YouTube video with a 20 SMA strategy.
    // Maybe I should turn that into code.

 */

const clone = require('clone')

const defaultConfig = {
  tf: '1h',
  ma: 'sma',
  period: 20
}

function init(baseTimeframe, config) {
  const ma = config.ma || defaultConfig.ma
  const period = config.period || defaultConfig.period
  const tf = config.tf || defaultConfig.tf
  const indicatorSpecs = {}
  indicatorSpecs[tf] = [ [ma, period ] ]
  function movingAverageSR(strategyState, marketState, executedOrders) {
    let state = strategyState ? clone(strategyState) : {}
    return [state, []]
  }
  return [indicatorSpecs, movingAverageSR]
}

module.exports = {
  init
}
