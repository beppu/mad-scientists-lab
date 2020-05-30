const request = require('request-promise')
const time = require('./time')

/**
 * Sound an alarm on interval boundaries
 * @param {String} tf - timeframe string (like 5m or 1h)
 * @returns {Promise<Number>} intervalId
 */
async function intervalAlarm(tf) {
  const alarm = 'http://localhost:5000/a/small'
  const interval = time.timeframeToMilliseconds(tf)
  const id = setInterval(async () => {
    return request(alarm)
  }, interval)
  return id
}

module.exports = {
  intervalAlarm
}
