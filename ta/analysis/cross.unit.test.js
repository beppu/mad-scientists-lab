const cross = require('./cross')

// use these for alignment tests
const
a = [1, 2, 3],
b = [10, 20, 30],
c = [100, 200, 300]

// use these for cross tests
const
d = [50, 45],
e = [65, 40]

// use these when ascending to descending state change is needed
const
f = [10, 40, 80],
g = [20, 10, 5],
h = [30, 50, 90]

test("crossedUpNow should return true for e vs d", () => {
  expect(cross.crossedUpNow(e, d)).toBe(true)
  expect(cross.crossedUpNow(d, e)).toBe(false)
})

test("crossedDownNow should return true for d vs e", () => {
  expect(cross.crossedDownNow(d, e)).toBe(true)
  expect(cross.crossedDownNow(e, d)).toBe(false)
})

test("crossedUp should return true for e vs d", () => {
  expect(cross.crossedUp(e, d)).toBe(true)
})

test("crossedDown should return true for d vs e", () => {
  expect(cross.crossedDown(d, e)).toBe(true)
})

test("isDescending should be true for c, b, a", () => {
  expect(cross.isDescending([c, b, a])).toBe(true)
})

test("isAscending should be true for a, b, c", () => {
  expect(cross.isAscending([a, b, c])).toBe(true)
})

test("becameDescending should be false for c, b, a", () => {
  // It should be false, because the whole series is in a descending state
  // and didn't change from ascending to descending at index 0.
  expect(cross.becameDescending([c, b, a])).toBe(false)
})

test("becameAscending should be false for a, b, c", () => {
  // Similarly, this did not become ascending, because it was always ascending.
  expect(cross.becameAscending([a, b, c])).toBe(false)
})

test("becameDescending should be true for [h, g, f] && [e, d]", () => {
  expect(cross.becameDescending([h, g, f])).toBe(true)
  expect(cross.becameDescending([e, d])).toBe(true)
})

test("becameAscending should be true for [f, g, h] && [d, e]", () => {
  expect(cross.becameAscending([f, g, h])).toBe(true)
  expect(cross.becameAscending([d, e])).toBe(true)
})
