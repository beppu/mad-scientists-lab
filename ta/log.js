/*

  I need a place for my shared logging code. Backtesting and livetesting need
  the same (or very similar) order logging, but they need it in different parts
  of the code, because executed orders come back differently depending on
  context.

  Imagine an API like this:

  let logPath = `./log/${strategy}/${configString}`
  let executedOrders = []
  let r = await log.orders(logPath, executedOrders)

 */

const fs = require('fs')
const path = require('path')

const mkdirp = require('mkdirp')
const pino = require('pino')
const hash = require('object-hash')

/**
 * Return the directory a strategy's executed order logs should go.
 * @param {String} prefix - base log directory
 * @param {Object} config - strategy config
 * @param {Function} fn - (optional) function that transforms `config` into a path-friendly string
 * @returns {String} Return description.
 */
function executedOrderLogDir(prefix, config, fn) {
  const slugFn = fn ? fn : hash
  const [strategyName, strategyConfig] = config
  return `${prefix}/${strategyName}/${slugFn(strategyConfig)}`
}

/**
 * Return a log file name based on begin and end DateTimes
 * @param {DateTime} begin - The DateTime the strategy should begin
 * @param {DateTime} end - The DateTime the strategy should end
 * @returns {String} A log file name
 */
function logName(begin, end) {
  if (begin && !end) {
    return `${begin.toISODate()}.log`
  } else if (begin && end) {
    return `${begin.toISODate()}__to__${end.toISODate()}.log`
  } else {
    return "all"
  }
}

function createOrderLogger(begin, end, prefix, config, fn) {
  const logDir = executedOrderLogDir(prefix, config, fn)
  console.log(logDir)
  mkdirp.sync(logDir)
  const name = logName(begin, end)
  const logFile = `${logDir}/${name}`
  return pino(pino.destination(logFile))
}

module.exports = {
  executedOrderLogDir,
  logName,
  createOrderLogger // This is the function most users will care about.
}
