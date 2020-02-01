const micro = require('micro')
const q = require('workq')()

const audio = require('./audio')

async function send(message) {
  q.add(async () => {
    const actions = []
    if (message.sound) {
      actions.push(audio.play(message.sound))
    }
    if (message.message) {
      actions.push((async () => { console.log(message.message); return true })())
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
