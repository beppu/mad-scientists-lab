/*

  Detect Guppy EMA color.

  These functions came straight from bin/guppy with no changes. This is the
  first time I haven't had to make any changes, but it's fine the way it is.

  I didn't bother renaming the guppyColors function, because it's mostly for
  internal use. It's unlikely that guppy.guppyColors will be called, so I don't
  care if it looks weird in that unlikely scenario. The other two functions are
  the main public interface.

  Requirements:
  The InvertedMarketData structure must contain EMAs in the periods specified by
  allEMAs.

 */

const fastEMAs = [3, 5, 8, 10, 12, 15]
const slowEMAs = [30, 35, 40, 45, 50, 60]
const allEMAs = fastEMAs.concat(slowEMAs)

// Big thanks to Chris Moody whose CM_Guppy_EMA pinescript indicator I ported to Javascript.
function guppyColors(imd, index) {
  const ema = []
  allEMAs.forEach((period, i) => {
    const ma = `ema${period}`
    ema[i+1] = imd[ma][index]
  })
  //Fast EMA Color Rules
  const colfastL = (ema[1] > ema[2] && ema[2] > ema[3] && ema[3] > ema[4] && ema[4] > ema[5] && ema[5] > ema[6])
  const colfastS = (ema[1] < ema[2] && ema[2] < ema[3] && ema[3] < ema[4] && ema[4] < ema[5] && ema[5] < ema[6])
  //Slow EMA Color Rules
  const colslowL = ema[7] > ema[8] && ema[8] > ema[9] && ema[9] > ema[10] && ema[10] > ema[11] && ema[11] > ema[12]
  const colslowS = ema[7] < ema[8] && ema[8] < ema[9] && ema[9] < ema[10] && ema[10] < ema[11] && ema[11] < ema[12]
  //Fast EMA Final Color Rules
  const colFinal = colfastL && colslowL ? 'aqua' : colfastS && colslowS ? 'orange' : 'gray'
  //Slow EMA Final Color Rules
  const colFinal2 = colslowL ? 'green' : colslowS ? 'red' : 'gray'
  return {
    colfastL,
    colfastS,
    colslowL,
    colslowS,
    colFinal,
    colFinal2
  }
}

/**
 * Detect whether the Guppy EMAs have turned into a new color in the current candle.
 * @param {InvertedMarketData} imd - inverted market data
 * @param {String} color - 'green', 'gray' or 'red'
 * @returns {Boolean} true if the Slow EMAs have turned into the specified color
 */
function haveSlowEMAsTurnedColor(imd, color) {
  const col0 = guppyColors(imd, 0)
  const col1 = guppyColors(imd, 1)
  return (col1.colFinal2 != color && col0.colFinal2 == color)
}

/**
 * See if the Guppy EMAs are a certain color now
 * @param {InvertedMarketData} imd - inverted market data
 * @param {String} color - 'green', 'gray' or 'red'
 * @returns {Boolean} true if the Slow EMAs are the specified color now
 */
function isSlowEMAColoredNow(imd, color) {
  const col0 = guppyColors(imd, 0)
  return col0.colFinal2 == color
}

module.exports = {
  fastEMAs,
  slowEMAs,
  allEMAs,
  guppyColors,
  haveSlowEMAsTurnedColor,
  isSlowEMAColoredNow,
}
