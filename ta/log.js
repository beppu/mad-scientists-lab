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

const Lazy = require('lazy.js')
const mkdirp = require('mkdirp')
const pino = require('pino')
const hash = require('object-hash')
const sprintf = require('sprintf')

const time = require('./time')
const utils = require('./utils')

/**
 * Return the directory a strategy's executed order logs should go.
 * @param {DateTime} begin - DateTime where trading begins
 * @param {DateTime} end - DateTime where trading ends
 * @param {String} exchange - exchange to trade on
 * @param {String} market - market to trade
 * @param {String} prefix - base log directory
 * @param {Object} config - strategy config
 * @param {Function} fn - (optional) function that transforms `config` into a path-friendly string
 * @returns {String} Return directory to store order logs
 */
function executedOrderLogDir(begin, end, exchange, market, prefix, config, fn) {
  const slugFn = fn ? fn : hash
  const [strategyName, strategyConfig] = config
  const _market = market.replace(/\W/g, '')
  //return `${prefix}/${strategyName}/${slugFn(strategyConfig)}`
  return `${prefix}/${sprintf('%d%02d%02d', begin.year, begin.month, begin.day)}.${exchange}.${_market}.${strategyName}.${slugFn(strategyConfig)}`
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

/**
 * Concat executedOrderLogDir and logName together
 * @param {DateTime} begin - The DateTime the strategy should begin
 * @param {DateTime} end - The DateTime the strategy should end
 * @param {String} prefix - base log directory
 * @param {Object} config - strategy config
 * @param {Function} fn - (optional) function that transforms `config` into a path-friendly string
 * @returns {String} Return full path of order log
 */
function fullExecutedOrderLogName(begin, end, prefix, config, fn) {
  return path.join(executedOrderLogDir(prefix, config, fn), logName(begin, end))
}

/**
 * Create a pino logger for a Strategy+config
 * @param {DateTime} begin - DateTime where trading begins
 * @param {DateTime} end - DateTime where trading ends
 * @param {String} exchange - exchange to trade on
 * @param {String} market - market to trade
 * @param {String} prefix - base log directory
 * @param {Object} config - strategy config
 * @param {Function} fn - (optional) function that transforms `config` into a path-friendly string
 * @returns {Pino} A pino logger
 */
function createOrderLogger(begin, end, exchange, market, prefix, config, fn) {
  const logDir = executedOrderLogDir(begin, end, exchange, market, prefix, config, fn)
  mkdirp.sync(logDir)
  const inner = Object.assign({}, config[1])
  delete inner.logger
  fs.writeFileSync(`${logDir}/config.json`, JSON.stringify(inner, undefined, '  '))
  const name = logName(begin, end)
  const logFile = `${logDir}/${name}`
  const logger = pino(pino.destination(logFile))
  logger.dir = logDir
  return logger
}

/**
 * Read an order log and generate stats from it.
 * This only works for strategies where buys and sells are perfectly paired (usually via market orders)
 * When I get limit orders figured out, I'll have to do something more sophisticated.
 * @param {String} path - full path of order log file
 * @returns {Object} stats about the trading session
 */
function summarizeOrderLog(path) {
  const jsons = fs.readFileSync(path).toString().split("\n").filter((id) => id).map(JSON.parse)
  const report = jsons.reduce((m, a) => {
    if (m.open === undefined) {
      m.open = a
      return m
    }
    if (m.open && m.close === undefined) {
      m.close = a
      const trade = {
        side: m.open.side,
        type: m.open.type,
        symbol: m.open.symbol,
        quantity: m.open.quantity,
        entryPrice: m.open.price,
        entryAt: m.open.ts,
        entryFee: m.open.fee,
        exitPrice: m.close.price,
        exitAt: m.close.ts,
        exitFee: m.close.fee,
      }
      const profit = utils.profitLoss(m.open.quantity * m.open.price, m.open.price, m.close.price, 100, m.open.side === 'sell')
      trade.profit = profit.profitLoss
      trade.profit$ = m.close.price * profit.profitLoss
      m.trades.push(trade)
      m.open = undefined
      m.close = undefined
    }
    return m
  }, { trades: [], open: undefined, close: undefined })
  const winners = Lazy(report.trades).filter((t) => t.profit > 0).toArray()
  const losers = Lazy(report.trades).filter((t) => t.profit < 0).toArray()
  report.winners = winners.length
  report.losers = losers.length
  report.winnersSum = Lazy(winners).map((t) => t.profit$).sum()
  report.losersSum = Lazy(losers).map((t) => t.profit$).sum()
  delete report.open
  delete report.close
  return report
}

module.exports = {
  executedOrderLogDir,
  logName,
  fullExecutedOrderLogName,
  createOrderLogger, // This is the function most users will care about.
  summarizeOrderLog
}
