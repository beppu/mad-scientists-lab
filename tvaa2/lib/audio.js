const exec = require("exec-sh").promise

async function play(file, opts) {
  await exec(`mplayer ${file}`)
}

async function say(string, opts) {
}

module.exports = {
  play,
  say
}
