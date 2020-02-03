const { send, json } = require('micro')
const DB = require('../../lib/db')

module.exports.GET = async function(req, res) {
  const db = await DB.instance()
  const key = req.params.key
  const state = await db.getState()
  const r = {}
  r[key] = state.config[key]
  send(res, 200, r)
}

module.exports.POST = async function(req, res) {
  const db = await DB.instance()
  const key = req.params.key
  const data = await json(req)
  if (!data.hasOwnProperty('value')) {
    send(res, 400, { success: false, message: 'value key must be provided' })
    return
  }
  const k = `config.${key}`
  let r = await db.set(k, data.value).write()
  send(res, 200, r.config)
}
