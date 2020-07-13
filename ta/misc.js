const fs      = require('fs')
const request = require('request-promise')
const time    = require('./time')
const clone   = require('clone')

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

/**
 * Help me write out a bunch of derivative configs for systematic backtesting
 * list.forEach((c) => misc.writeConfigSync(gp, c, strategies.Guppy.configSlug))
 * @param {Object} base - gp.json (Guppy strategy config)
 * @param {Array} params - an array with customized guppyTf and rsiTf
 * @param {Function} fn - a function that takes a Guppy strategy config and stringifies it in a path-friendly way
 */
function writeConfigSync(base, params, fn) {
  const newConfig = clone(base)
  newConfig.guppyTf = params[0]
  newConfig.rsiTf = params[1]
  const filename = `configs/${fn(newConfig)}.json`
  fs.writeFileSync(filename, JSON.stringify(newConfig, undefined, '  '))
}

module.exports = {
  intervalAlarm,
  writeConfigSync
}
