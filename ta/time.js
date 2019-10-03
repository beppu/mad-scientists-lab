
function timeframeToMinutes(timeframe) {
  const match  = timeframe.match(/(\d+)(\w+)/);
  if (!match) {
    throw new Error(`Invalid timeframe: '${timeframe}'`);
  }
  const nu = match[1];
  const unit = match[2];
  const n = Math.min(parseInt(nu, 10));
  switch (unit) {
  case 'm':
    return n;
  case 'h':
    return 60 * n;
  case 'd':
    return 24 * 60 * n;
  }
  throw new Error(`Unsupported timeframe: '${timeframe}'`);
}


function timestampForTimeframe(timeframe, ms) {
  const ints = timeframeToMinutes(timeframe) * 60 * 1000;
  const diff = ms % ints;
  return ms - diff;
}

function translatePeriods(periods, tf1, tf2) {
  const tf1m = timeframeToMinutes(tf1)
  const tf2m = timeframeToMinutes(tf2)
  const factor = tf2m / tf1m
  return periods.map((p) => p * factor)
}

module.exports = {
  timeframeToMinutes,
  timestampForTimeframe,
  translatePeriods
}
