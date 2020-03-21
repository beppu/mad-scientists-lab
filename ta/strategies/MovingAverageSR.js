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

module.exports = function init(baseTimeframe, config) {
  const ma = config.ma || 'sma'
  const period = config.period || 20
  const indicatorSpecs = {}
  indicatorSpecs[baseTimeframe] = [ [ma, period ] ]
  function movingAverageSR(state) {
    return []
  }
  return [indicatorSpecs, movingAverageSR]
}
