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
  const n = Math.min(utils.parseIntB10(nu));
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

module.exports = {
  dt,
  iso,
  timeframeToMinutes,
  timeframeToMilliseconds,
  timestampForTimeframe,
  translatePeriods,
  isTimeframeBoundary
}
