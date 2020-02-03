const micro = require('micro')
const q = require('workq')()

const audio = require('./audio')
const desktop = require('./desktop')

async function send(message) {
  q.add(async () => {
    const actions = []
    if (message.sound) {
      actions.push(audio.play(message.sound))
    }
    if (message.speech) {
      actions.push(audio.say(message.speech))
    }
    if (message.desktop) {
      actions.push(desktop.notify(message.desktop))
    }
    return Promise.all(actions)
  })
}

function handlerFn(sound) {
  return async (req, res) => {
    let message = "TradingView Alert"
    try {
      message = await micro.text(req)
    } catch(e) {
      console.warn(e)
    }
    send({ sound, message })
    micro.send(res, 200, { success: true, sound, message })
  }
}

module.exports = {
  send,
  handlerFn
}
