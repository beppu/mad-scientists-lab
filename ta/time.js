const {DateTime, Interval} = require('luxon')
const utils = require('./utils')

/**
 * A wrapper around DateTime.fromMillis
 * @param {Number} ms - A unix time in milliseconds
 * @returns {DateTime} ms converted to a DateTime
 */
function dt(ms) {
  return DateTime.fromMillis(ms)
}

function timeframeToMinutes(timeframe) {
  const match  = timeframe.match(/(\d+)(\w+)/);
  if (!match) {
    throw new Error(`Invalid timeframe: '${timeframe}'`);
  }
  const nu = match[1];
  const unit = match[2];
  const n = Math.min(utils.parseIntB10(nu));
  switch (unit) {
  case 'm':
    return n;
  case 'h':
    return 60 * n;
  case 'd':
    return 24 * 60 * n;
  case 'w':
    return 24 * 60 * 7 * n;
  }
  throw new Error(`Unsupported timeframe: '${timeframe}'`);
}

function timeframeToMilliseconds(timeframe) {
  return timeframeToMinutes(timeframe) * 60000
}


function timestampForTimeframe(timeframe, ms) {
  const ints = timeframeToMinutes(timeframe) * 60 * 1000;
  const diff = ms % ints;
  return ms - diff;
}

function translatePeriods(periods, tfSrc, tfDst) {
  const tfDstm = timeframeToMinutes(tfDst)
  const tfSrcm = timeframeToMinutes(tfSrc)
  const factor = tfSrcm / tfDstm
  return periods.map((p) => p * factor)
}

function isTimeframeBoundary(timeframe, time) {
  const match  = timeframe.match(/(\d+)(\w+)/);
  if (!match) {
    return false;
  }
  const nu = match[1];
  const unit = match[2];
  const n = Math.min(utils.parseIntB10(nu));
  const dayOfYear = Math.floor(
    Interval.fromDateTimes(DateTime.utc(time.year, 1, 1), time).length() + 1);

  switch (unit) {
  case 'm':
    if (time.minute % n === 0) return true;
    break;
  case 'h':
    if (time.hour % n === 0 && time.minute === 0) return true;
    break;
  case 'd':
    if (time.minute === 0 && time.hour === 0 && dayOfYear % n === 0) return true;
    break;
  }
  return false;
}

module.exports = {
  dt,
  timeframeToMinutes,
  timeframeToMilliseconds,
  timestampForTimeframe,
  translatePeriods,
  isTimeframeBoundary
}
