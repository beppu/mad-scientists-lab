const xdg = require('xdg-basedir')
const sqlite = require('sqlite')
const SQL = require('sql-template-strings')
const pino = require('pino')
const logger = pino()
const mkdirp = require('mkdirp')
const Promise = require('bluebird')
const { DateTime } = require('luxon')
const notifier = require('node-notifier')
const request = require('request-promise')
const {spawn} = require('child_process')
const {streamWrite, streamEnd, onExit} = require('@rauschma/stringio')

const time = require('./time')

const alertLoggerPath = process.env.TA_ALERT_LOG || '/tmp/alert.log'
const alertLogger = pino(pino.destination(alertLoggerPath))

function speakableMarket(market) {
  return market.replace(/([A-Z])/g, '$1.')
}

const deliveryMethods = {
  log: async function(exchange, market, timeframe, message) {
    alertLogger.info({ exchange, market, timeframe, message })
  },

  webhook: async function(exchange, market, timeframe, message, options) {
    await request.post(options.url)
  },

  tts: async function(exchange, market, timeframe, message, options) {
    // Big thanks to @rauschma
    // https://2ality.com/2018/05/child-process-streams.html
    const espeak = spawn('espeak', [], { stdio: ['pipe', process.stdout, process.stderr]})
    const _market = speakableMarket(market)
    const _message = message.replace(new RegExp(market, 'g'), _market)
    await streamWrite(espeak.stdin, `${exchange}, ${_market}, ${timeframe}\n`)
    await streamWrite(espeak.stdin, _message + "\n")
    await streamEnd(espeak.stdin)
    await onExit(espeak)
  },

  desktop: async function(exchange, market, timeframe, message) {
    notifier.notify({
      title: `${exchange} ${market} ${timeframe}`,
      message
    })
  }
}

const DEFAULT_DELIVERY = [
  ['log', {}],
  ['webhook', { url: 'http://localhost:5000/hooks/alert' }],
  ['desktop', {}],
  ['tts', {}]
]

class Alerts {

  constructor() {
    this.dbDataDir = `${xdg.data}/ta`
    this.dbFile    = `${xdg.data}/ta/alerts.db`
  }

  async init() {
    mkdirp.sync(this.dbDataDir)
    this.db         = await sqlite.open(this.dbFile, { Promise })
    this.resMigrate = await this.db.migrate({ migrationsPath: `${__dirname}/migrations` })
  }

  async isAlreadySent(exchange, market, timeframe, message) {
    const now = DateTime.local().toMillis()
    const candle = time.timestampForTimeframe(timeframe, now)
    const sent = await this.db.get(SQL`
      SELECT created_at
        FROM sent
       WHERE exchange=${exchange} AND market=${market} AND timeframe=${timeframe} AND
             candle_at=${candle} AND message=${message}
       LIMIT 1
    `)
    if (sent) {
      return true
    } else {
      return false
    }
  }

  async markSent(exchange, market, timeframe, message) {
    const now = DateTime.local().toMillis()
    const candle = time.timestampForTimeframe(timeframe, now)
    return this.db.run(SQL`
      INSERT INTO sent
             (exchange, market, timeframe, candle_at, message, created_at)
      VALUES (${exchange}, ${market}, ${timeframe}, ${candle}, ${message}, ${now})`)
  }

  async send(exchange, market, timeframe, message, delivery) {
    if (!delivery) {
      delivery = DEFAULT_DELIVERY
    }
    const sent = await this.isAlreadySent(exchange, market, timeframe, message)
    if (sent) {
      logger.warn({ warning: 'AlreadySent', exchange, market, timeframe, message })
      return false
    }
    try {
      await this.markSent(exchange, market, timeframe, message)
      let res = await Promise.each(delivery, async ([name, options]) => {
        try {
          if (deliveryMethods[name]) {
            return await deliveryMethods[name](exchange, market, timeframe, message, options)
          }
        }
        catch (err) {
          logger.error(err)
        }
        return false
      })
      return res
    } catch(err) {
      logger.error(err)
      return undefined
    }
  }
}




module.exports = {
  Alerts,
  deliveryMethods,
  DEFAULT_DELIVERY,
  speakableMarket
}
