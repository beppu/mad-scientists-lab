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

global.ta = require('./index')
global.alerts = require('./alerts')
global.time = require('./time')

// XXX - This function works for XBTUSD, but what about other markets?
global.profitLoss = function profitLoss(quantity, entry, exit, leverage, short) {
  const entryValue = quantity / entry
  const exitValue  = (exit / entry) * entryValue
  const profitLoss = short ? entryValue - exitValue : exitValue - entryValue
  const profitLossPercent = short ? (exitValue / entryValue * 100) : (entryValue / exitValue * 100)
  const roe = profitLossPercent * leverage
  return { entryValue, exitValue, profitLoss, profitLossPercent, roe }
}

