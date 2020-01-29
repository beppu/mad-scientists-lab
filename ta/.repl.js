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

global.ta = require('./index')
global.alerts = require('./alerts')
global.time = require('./time')
global.utils = require('./utils')

global.profitLoss = global.utils.profitLoss
