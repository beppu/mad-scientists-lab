const requireDirectory = require('require-directory')
module.exports = requireDirectory(module, { exclude: /unit\.test/ })
