
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

function translatePeriods(periods, tfSrc, tfDst) {
  const tfDstm = timeframeToMinutes(tfDst)
  const tfSrcm = timeframeToMinutes(tfSrc)
  const factor = tfSrcm / tfDstm
  return periods.map((p) => p * factor)
}

module.exports = {
  timeframeToMinutes,
  timestampForTimeframe,
  translatePeriods
}
