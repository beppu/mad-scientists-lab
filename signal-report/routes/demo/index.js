const fs = require('fs')
const { send, json } = require('micro')
const pug = require('pug')
const {DateTime} = require('luxon')

const template = pug.compileFile(`${__dirname}/signals.pug`)

async function loadSignals(file) {
  const buffer = fs.readFileSync(file)
  const lines = buffer.toString().split("\n")
  lines.splice(-1)
  const signals = lines.map((line) => {
    let signal = JSON.parse(line)
    signal.timestamp = DateTime.fromISO(signal.ts)
    return signal
  }).reverse()
  return signals
}

module.exports.GET = async (req, res) => {
  const file = process.env.TA_SIGNAL_DEMO || '../ta/log/backtest/activity.log'
  console.log(process.cwd())
  const signals = await loadSignals(file)
  send(res, 200, template({ signals }))
}
