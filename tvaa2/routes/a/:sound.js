const { send, json } = require('micro')
const alert = require('../../lib/alert')

module.exports.GET = async (req, res) => {
  const sound = `${__dirname}/../../sounds/${req.params.sound}`
  const payload = req.query.message ? { sound, message: req.query.message } : { sound }
  alert.send(payload)
  send(res, 200, { success: true, sound })
}

module.exports.POST = async (req, res) => {
  const sound = `${__dirname}/../../sounds/${req.params.sound}`
  alert.send({ sound })
  send(res, 200, { success: true, sound })
}
