/*
 * The pipeline needs more testing.
 * It has to aggregate and calculate indicators in multiple timeframes at the same time.
 * Is it doing it right?
 * My initial investigation with research/Divergence* leads me to believe it's not.
 * I've tested a lot of things individually.
 * - candle consumption
 * - aggregation
 * - indicator calculation
 *
 * However, I haven't fully tested everything happening at once through the pipeline.
 * That's what this is for, and my immediate goal is to make divergence checking work.
 * That's why I'm testing:
 * - candle aggregation
 * - bband calculation
 * - rsi calculation
 *
 * That's from easiest to hardest.
 */

const talib = require('talib')
const ta = require('../index')
const pipeline = require('../pipeline')
const indicators = require('../indicators')

test("simultaneous aggregation in multiple timeframes should generate the right candles", () => {
  // I want to pull in a bigger dataset for this test and the others I end up writing here.
})

/*
test("simultaneous aggregation should calculate the right SMA values", () => {
  // I want to pull in a bigger dataset for this test and the others I end up writing here.
})
*/

test("simultaneous aggregation should calculate the right Bollinger Band values", () => {
  // I want to pull in a bigger dataset for this test and the others I end up writing here.
})

test("simultaneous aggregation should calculate the right RSI values", () => {
  // I want to pull in a bigger dataset for this test and the others I end up writing here.
})
