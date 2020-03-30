const keypress = require('keypress')
keypress(process.stdin)
const q = []

/**
 * Turn stdin to raw mode and listen for keyboard events.
 */
function init() {
  process.stdin.on('keypress', (ch, key) => {
    q.push(key)
  })
  process.stdin.setRawMode(true)
  process.stdin.resume()
}

/**
 * Return the next key in the input queue.
 * @returns {Object} object describing the keyboard state created by the input
 */
async function keyPress() {
  const wait = new Promise((resolve, reject) => {
    let int = setInterval(() => {
      if (q.length) {
        const key = q.shift()
        resolve(key)
        clearInterval(int)
      }
    }, 100)
  })
  return wait
}

module.exports = {
  init,
  keyPress
}

/*
async function main() {
  let end = false
  while (!end) {
    const k = await key()
    console.log(k)
    if (k.ctrl && k.name === 'q') {
      end = true
    }
  }
  process.stdin.setRawMode(false)
  process.stdin.resume()
  process.exit(0)
}

main()
*/
