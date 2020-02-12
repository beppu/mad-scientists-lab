const exec = require("exec-sh").promise
const { spawn } = require('child_process')
const { streamWrite, streamEnd, onExit } = require('@rauschma/stringio')
const DB = require('./db')

async function play(file, opts) {
  const db = await DB.instance()
  const volume = db.get('config.volume').value()
  await exec(`mplayer -volume ${volume} ${file}`)
}

// tvaa2 volume is 0-100 as understood by mplayer
// espeak volume is 0-200 but it doesn't scale the same way mplayer does.
// applying this exponential function was my attempt to make espeak volumes match mplayer's volume
function _espeakVolume(v) {
  return 0.02 * (v ** 2)
}

async function say(message, opts) {
  const db = await DB.instance()
  const volume = _espeakVolume(db.get('config.volume').value())
  const espeak = spawn('espeak', ['-a', volume], { stdio: ['pipe', process.stdout, process.stderr]})
  await streamWrite(espeak.stdin, message + "\n")
  await streamEnd(espeak.stdin)
  await onExit(espeak)
}

function speakableMarket(market) {
  return market.replace(/([A-Z])/g, '$1.')
}

function makeSpeakable(payload) {
  const {exchange, market, timeframe, message} = payload
  const _market = speakableMarket(market)
  const speakable = `${exchange}, ${_market}, ${timeframe}; ${message}`
  return speakable
}

module.exports = {
  play,
  say,
  speakableMarket,
  makeSpeakable
}
