const Jimp = require('jimp')

async function createBlackBar(w, h) {
  return new Jimp(w, h, 0x000000ff)
}

async function censor(path, x, y, w, h) {
  const image = await Jimp.read(path)
  const blackBar = await createBlackBar(w, h)
  //console.log({x, y})
  return await image.blit(blackBar, x, y)
}

module.exports = {
  createBlackBar,
  censor
}
