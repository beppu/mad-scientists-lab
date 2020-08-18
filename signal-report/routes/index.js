const { send, json } = require('micro')

module.exports.GET = async (req, res) => {
  send(res, 200, { name: "Signal Report" })
}
