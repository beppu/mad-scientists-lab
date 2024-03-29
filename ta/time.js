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
 * A wrapper around DateTime.fromISO
 * @param {String} iso - an ISO-8601 formatted DateTime string
 * @returns {DateTime} a DateTime object
 */
function dti(iso) {
  return DateTime.fromISO(iso)
}

/**
 * Return milliseconds as an ISO 8601 formatted datetime string
 * @param {Number} ms - A unix time in milliseconds
 * @returns {String} ISO 8601 formatted DateTime string
 */
function iso(ms) {
  return dt(ms).toISO()
}

/**
 * Return milliseconds as a UTC timezone ISO 8601 formatted datetime string
 * @param {Number} ms - A unix time in milliseconds
 * @returns {String} ISO 8601 formatted DateTime string
 */
function isoUTC(ms) {
  return dt(ms).setZone('UTC').toISO()
}

/**
 * Output a datetime in a format gnuplot can read
 * @param {Number} ms - A unix time in milliseconds
 * @returns {String} like isoUTC without the timezone info at the end
 */
function isoGP(ms) {
  return isoUTC(ms).replace(/\.000Z/, '') // for gnuplot
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
    return 24 * 60 * 7 * n; // FIXME - I have a feeling this might not be accurate enough.
  }
  throw new Error(`Unsupported timeframe: '${timeframe}'`);
}

function timeframeToMilliseconds(timeframe) {
  return timeframeToMinutes(timeframe) * 60000
}

/**
 * Given a timeframe and a timestamp, return the timestamp for the beginning of the timeframe's candle
 * @param {String} timeframe - timeframe of candle
 * @param {Number} ms - A unix time in milliseconds
 * @returns {Return Type} Return description.
 */
function timestampForTimeframe(timeframe, ms) {
  const ints = timeframeToMinutes(timeframe) * 60 * 1000;
  const diff = ms % ints;
  return ms - diff;
}

/**
 * Given a list of periods, translate them from one timeframe to another
 * @param {Array<Number>} periods - Array of period lengths (usually MA lengths)
 * @param {String} tfSrc - source timeframe
 * @param {String} tfDst - destination timeframe
 * @returns {Array<Number>} translated periods in destination timeframe (1h 200 SMA == 4h 50 SMA)
 */
function translatePeriods(periods, tfSrc, tfDst) {
  const tfDstm = timeframeToMinutes(tfDst)
  const tfSrcm = timeframeToMinutes(tfSrc)
  const factor = tfSrcm / tfDstm
  return periods.map((p) => p * factor)
}

/**
 * Given a timeframe and a timestamp, is the timestamp on a timeframe boundary (aka the beginning of the timeframe block)
 * @param {String} timeframe - timeframe of candle
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
  case 'w': // TODO - Implement weekly boundary
    break;
  }
  return false;
}

module.exports = {
  dt,
  dti,
  iso,
  isoUTC,
  isoGP,
  timeframeToMinutes,
  timeframeToMilliseconds,
  timestampForTimeframe,
  translatePeriods,
  isTimeframeBoundary
}
