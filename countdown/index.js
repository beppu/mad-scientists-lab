const time = require('./time')

function noop() {}

function parseDurationToMilliseconds(s) {
  const s2 = s.trim()
  const durationSpecs = s2.split(/\s+/)
  const duration = durationSpecs.map(time.timeframeToMilliseconds).reduce((m, a) => {
    return m + a
  }, 0)
  return duration
}

function startTimer(duration, step=1000, onProgress=noop, onFinish=noop) {
  let elapsed = 0
  let timer = undefined
  timer = setInterval(() => {
    elapsed += step
    onProgress(elapsed)
    if (elapsed >= duration) {
      onFinish(elapsed)
      clearInterval(timer)
    }
  }, step)
  return timer
}

module.exports = {
  parseDurationToMilliseconds,
  startTimer
}
