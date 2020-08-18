const {send} = require('micro')

const css = `
body {
  margin: 5em;
}

ul.signals {
  list-style-type: none;
}

div.signal {
  padding: 1em;
}

.buy {
  background-color: #cfc;
}

.sell {
  background-color: #fcc;
}

`

module.exports.GET = async (req, res) => {
  res.setHeader('Content-Type', 'text/css')
  send(res, 200, css)
}
