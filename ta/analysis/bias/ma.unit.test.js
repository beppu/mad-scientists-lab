const bias = {
  ma: require('./ma')
}

const candles = require('../../tests/fixtures/candles.json')

test("bias.ma should have an arity of 2", () => {
  expect(bias.ma.length).toBe(2)
})

test("bias.ma should perceive imdBull as bullish", () => {
  const imdBull = {
    close: [10, 5],
    ema9: [3, 1]    // slope is positive && ma[0] is beloew price
  }
  const b = bias.ma(imdBull.close, imdBull.ema9)
  expect(b).toBe('bullish')
})

test("bias.ma should perceive imdBear as bearish", () => {
  const imdBear = {
    close: [5, 10],
    ema9: [10, 15]  // slope is negative && ma[0] is above price
  }
  const b = bias.ma(imdBear.close, imdBear.ema9)
  expect(b).toBe('bearish')
})

test("bias.ma should perceive imdX as undefined", () => {
  const imdX = {
    close: [11, 10],
    ema9: [19, 5]    // slope is postive but ma[0] is above price
  }
  const b = bias.ma(imdX.close, imdX.ema9)
  expect(b).toBeUndefined()
})
