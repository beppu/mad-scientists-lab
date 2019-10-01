function isAscending(comparables) {
  let rest = comparables.slice(1)
  let initial = { current: comparables[0], isAscending: true }
  let result = rest.reduce((m, a) => {
    if (m.isAscending == false) {
      return m
    }
    if (m.current > a) {
      m.isAscending = false
    }
    m.current = a
    return m
  }, initial)
  return result.isAscending
}

function isDescending(comparables) {
  let rest = comparables.slice(1)
  let initial = { current: comparables[0], isDescending: true }
  let result = rest.reduce((m, a) => {
    if (m.isDescending == false) {
      return m
    }
    if (m.current < a) {
      m.isDescending = false
    }
    m.current = a
    return m
  }, initial)
  return result.isDescending
}

module.exports = {
  isAscending,
  isDescending
}
