require('dotenv').config()

function reload(module){
  delete require.cache[require.resolve(module)]
  return require(module)
}

global.reload   = reload
global.rl       = reload
global.cl       = console.log

// global.Promise     = require('bluebird')
// global.Lazy        = require('lazy.js')
// global.moment      = require('moment')
// global.sprintf     = require('sprintf')
// global.outdent     = require('outdent')
global.ccxt        = require('ccxt')
global.talib       = require('talib')
global.luxon       = require('luxon')
global.DateTime    = global.luxon.DateTime
global.Interval    = global.luxon.Interval

global.ta         = require('./index')
global.alerts     = require('./alerts')
global.time       = require('./time')
global.utils      = require('./utils')
global.pipeline   = global.pl = require('./pipeline')
global.indicators = require('./indicators')
global.strategies = require('./strategies')
global.research   = require('./research')
global.analysis   = require('./analysis')
global.exchanges  = require('./exchanges')
global.live       = require('./live')
global.preset     = global.strategies.preset
global.misc       = require('./misc')

global.pnl = global.profitLoss = global.utils.profitLoss
const ccxt = global.ccxt
global.bitmex = new ccxt.bitmex()
global.binance = new ccxt.binance()
global.bybit = new ccxt.bybit()
global.ftx = new ccxt.ftx()

// Where I like to store my temporary results from async functions.
global.x = {}

// I use this test fixture a lot
global.candles = require('./tests/fixtures/candles.json')

console.log(Object.keys(global))
