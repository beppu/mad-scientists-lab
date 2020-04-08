const events = require('events')

function create(options) {
  let exchangeState = {}
  let executedOrders = []

  return function bybit(orders) {
    return [exchangeState, executedOrders]
  }
}

function candles() {
  const ee = new events.EventEmitter()
  return ee
}

module.exports = {
  create,
  candles
}
