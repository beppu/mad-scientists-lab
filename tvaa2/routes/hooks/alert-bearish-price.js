const { send } = require('micro')
const alert = require('../../lib/alert')
module.exports = alert.handlerFn(`${__dirname}/../../sounds/bearish-price`)
