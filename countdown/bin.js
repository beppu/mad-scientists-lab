#!/usr/bin/env node
const commander = require('commander')
const sprintf = require('sprintf')
const pkg = require('./package')
const countdown = require('./index')
const time = require('./time')

async function main() {
  const program = new commander.Command()
  program
    .version(pkg.version)
    .usage('[option] <durations>...')
    .option('-s, --step <milliseconds>', 'step size', time.parseIntB10, 100)
    .option('-p, --progress <style>', 'progress visualization style', 'default')
    .description('Imagine sleep(1) with progress visualization.')
  program.parse(process.argv)

  if (program.args.length < 1) {
    console.error('How long do you want the countdown to be?  Use TradingView notation for durations.  (30m == 30 minutes)')
    process.exit(1)
  }

  const opts = program.opts()
  let timeSpec = program.args.join(' ')
  if (timeSpec.match(/^\d+$/)) {
    timeSpec = `${timeSpec}s`
  }
  const duration = countdown.parseDurationToMilliseconds(timeSpec)
  let onProgress, onFinish
  switch (opts.progress) {
  case 'percent':
    onProgress = (elapsed) => {
      const percent = (elapsed / duration) * 100
      process.stdout.write(sprintf("%6s%%    \r", percent.toFixed(2)))
    }
    break
  default:
    const dt = time.normalizeMilliseconds(duration)
    onProgress = (elapsed) => {
      let et = time.normalizeMilliseconds(elapsed)
      process.stdout.write(sprintf('%02d:%02d:%02d.%03d / %02d:%02d:%02d.%03d\r', 
        et.hours, et.minutes, et.seconds, et.milliseconds,
        dt.hours, dt.minutes, dt.seconds, dt.milliseconds
      ))
    }
    break
  }
  onFinish = (elapsed) => {
    process.stdout.write("\n")
  }
  onProgress(0)
  const timer = countdown.startTimer(duration, opts.step, onProgress, onFinish)
}

if (require.main === module) {
  main()
}

module.exports = {
  main
}
