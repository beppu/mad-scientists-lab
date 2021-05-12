const { send, json } = require('micro')
const alert = require('../../lib/alert')
const audio = require('../../lib/audio')
const desktop = require('../../lib/desktop')

module.exports.GET = async (req, res) => {
  const sound = `${__dirname}/../../sounds/${req.params.sound}`
  const payload = req.query.message
    ? { sound,
        speech: req.query.speech || req.query.message,
        desktop: { title: req.query.title || 'tvaa2', message: req.query.message } }
    : { sound }
  alert.send(payload)
  send(res, 200, { success: true, sound })
}

module.exports.POST = async (req, res) => {
  const sound = `${__dirname}/../../sounds/${req.params.sound}`
  const data = await json(req)
  const payload = {
    sound,
    speech: audio.makeSpeakable(data),
    desktop: desktop.makeNotification(data)
  }
  alert.send(payload)
  send(res, 200, { success: true, sound })
}
