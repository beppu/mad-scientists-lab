const exec = require("exec-sh").promise
const { spawn } = require('child_process')
const { streamWrite, streamEnd, onExit } = require('@rauschma/stringio')
const DB = require('./db')

async function play(file, opts) {
  const db = await DB.instance()
  const volume = db.get('config.volume').value()
  await exec(`mplayer -volume ${volume} ${file}`)
}

async function say(message, opts) {
  const espeak = spawn('espeak', [], { stdio: ['pipe', process.stdout, process.stderr]})
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
