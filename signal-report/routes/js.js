const {send} = require('micro')

const js = `
var interval = setInterval(function(){
  window.location.reload()
}, 1000 * 30)
`

module.exports.GET = async (req, res) => {
  res.setHeader('Content-Type', 'application/javascript')
  send(res, 200, js)
}
