const bias = {
  ma: require('./ma')
}

const candles = require('../../tests/fixtures/candles.json')

test("bias.ma should have an arity of 2", () => {
  expect(bias.ma.length).toBe(2)
})

test("bias.ma should perceive imdBull as bullish", () => {
  const imdBull = {
    close: [10, 5], // slope is positive
    ema9: [3, 1]    // ma[0] is beloew price
  }
  const b = bias.ma(imdBull.close, imdBull.ema9)
  expect(b).toBe('bullish')
})

test("bias.ma should perceive imdBear as bearish", () => {
  const imdBear = {
    close: [5, 10], // slope is negative
    ema9: [10, 15]  // ma[0] is above price
  }
  const b = bias.ma(imdBear.close, imdBear.ema9)
  expect(b).toBe('bearish')
})

test("bias.ma should perceive imdX as undefined", () => {
  const imdX = {
    close: [11, 10], // slope is positive
    ema9: [19, 5]    // but ma[0] is above price
  }
  const b = bias.ma(imdX.close, imdX.ema9)
  expect(b).toBeUndefined()
})
