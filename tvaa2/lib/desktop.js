const notifier = require('node-notifier')

async function notify(title, message) {
  notifier.notify({ title, message })
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
