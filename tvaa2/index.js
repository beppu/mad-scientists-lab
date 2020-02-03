const { send } = require('micro')
const DB = require('./lib/db')
const db = DB.instance()
const match = require('fs-router')(__dirname + '/routes')

module.exports = async function(req, res) {
  let matched = match(req)
  if (matched) return await matched(req, res)
  send(res, 404, { error: 'Not found' })
}
