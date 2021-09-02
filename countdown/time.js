const {DateTime, Interval} = require('luxon')

/**
 * Parse a string as a base 10 number
 * @param {String} n - string to parse as a number
 * @returns {Number} the parsed number
 */
function parseIntB10(n) {
  return parseInt(n, 10)
}

/**
 * A wrapper around DateTime.fromMillis
 * @param {Number} ms - A unix time in milliseconds
 * @returns {DateTime} ms converted to a DateTime
 */
function dt(ms) {
  return DateTime.fromMillis(ms)
}

/**
 * Return date as an ISO 8601 formatted string
 * @param {Number} ms - A unix time in milliseconds
 * @returns {String} ISO 8601 formatted DateTime string
 */
function iso(ms) {
  return dt(ms).toISO()
}

function timeframeToMinutes(timeframe) {
  const match  = timeframe.match(/(\d+)(\w+)/);
  if (!match) {
    throw new Error(`Invalid timeframe: '${timeframe}'`);
  }
  const nu = match[1];
  const unit = match[2];
  const n = Math.min(parseIntB10(nu));
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
  const match  = timeframe.match(/(\d+)(\w+)/);
  if (!match) {
    throw new Error(`Invalid timeframe: '${timeframe}'`);
  }
  const nu = match[1];
  const unit = match[2];
  const n = Math.min(parseIntB10(nu));
  switch (unit) {
  case 'ms':
    return n
  case 's':
    return n * 1000
  case 'm':
    return n * 60 * 1000
  case 'h':
    return n * 60 * 60 * 1000
  case 'd':
    return n * 24 * 60 * 60 * 1000
  case 'w':
    return n * 7 * 24 * 60 * 60 * 1000
  }
  throw new Error(`Unsupported timeframe: '${timeframe}'`);
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

/**
 * Given a timeframe and a timestamp, is the timestamp on a timeframe boundary (aka the beginning of the timeframe block)
 * @param {String} timeframe - timeframe
 * @param {DateTime} time - timestamp
 * @returns {Boolean} True if this timestamp at the beginning of a timeframe boundary
 */
function isTimeframeBoundary(timeframe, time) {
  const match  = timeframe.match(/(\d+)(\w+)/);
  if (!match) {
    return false;
  }
  const utc = time.setZone('UTC')
  const nu = match[1];
  const unit = match[2];
  const n = Math.min(parseIntB10(nu));
  const dayOfYear = Math.floor(
    Interval.fromDateTimes(DateTime.utc(time.year, 1, 1), time).length() + 1);

  switch (unit) {
  case 'm':
    if (utc.minute % n === 0) return true;
    break;
  case 'h':
    if (utc.hour % n === 0 && utc.minute === 0) return true;
    break;
  case 'd':
    if (utc.minute === 0 && utc.hour === 0 && dayOfYear % n === 0) return true;
    break;
  }
  return false;
}

function normalizeMilliseconds(ms) {
  let hours = Math.floor(ms / (60*60*1000))
  let hr = ms % (60*60*1000)
  let minutes = Math.floor(hr / (60*1000))
  let mr = hr % (60*1000)
  let seconds = Math.floor(mr / 1000)
  let milliseconds = mr % 1000
  return { hours, minutes, seconds, milliseconds }
}

module.exports = {
  dt,
  iso,
  timeframeToMinutes,
  timeframeToMilliseconds,
  timestampForTimeframe,
  translatePeriods,
  isTimeframeBoundary,
  normalizeMilliseconds,
  parseIntB10
}
