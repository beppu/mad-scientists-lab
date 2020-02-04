const notifier = require('node-notifier')

function notify(opts) {
  notifier.notify(opts)
}

function makeNotification(payload) {
  const {exchange, market, timeframe, message} = payload
  return {
    title: `${exchange} ${market} ${timeframe}`,
    message
  }
}

module.exports = {
  notify,
  makeNotification
}
