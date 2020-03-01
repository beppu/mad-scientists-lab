const talib = require('talib')
const ta = require('../index')
const bbands = require('./bbands')

let candles

function initializeCandles() {
  candles = [
    [ 1576389600000, 7041, 7044.5, 7031, 7044.5, 26743558 ],
    [ 1576393200000, 7044.5, 7202, 7028, 7138, 336698683 ],
    [ 1576396800000, 7138, 7168, 7121.5, 7143.5, 76607903 ],
    [ 1576400400000, 7143.5, 7154, 7125, 7131.5, 36276825 ],
    [ 1576404000000, 7131.5, 7135, 7082, 7085.5, 78194320 ],
    [ 1576407600000, 7085.5, 7106.5, 7085, 7102, 34215966 ],
    [ 1576411200000, 7102, 7147.5, 7050.5, 7066.5, 133360862 ],
    [ 1576414800000, 7066.5, 7084.5, 7061.5, 7072.5, 54714049 ],
    [ 1576418400000, 7072.5, 7114, 7072.5, 7111, 60331487 ],
    [ 1576422000000, 7111, 7117.5, 7095, 7107, 30666945 ],
    [ 1576425600000, 7107, 7120, 7071.5, 7081.5, 49493215 ],
    [ 1576429200000, 7081.5, 7106, 7081, 7096.5, 21116461 ],
    [ 1576432800000, 7096.5, 7109, 7088, 7109, 14965018 ],
    [ 1576436400000, 7109, 7111, 7091.5, 7100, 17554196 ],
    [ 1576440000000, 7100, 7130, 7099.5, 7121.5, 29387426 ],
    [ 1576443600000, 7121.5, 7121.5, 7106, 7114.5, 17528675 ],
    [ 1576447200000, 7114.5, 7125, 7109.5, 7112, 18878914 ],
    [ 1576450800000, 7112, 7116, 7087.5, 7107.5, 30232935 ],
    [ 1576454400000, 7107.5, 7123, 7055.5, 7069, 87016241 ],
    [ 1576458000000, 7069, 7083.5, 7067.5, 7083.5, 29556971 ],
    [ 1576461600000, 7083.5, 7083.5, 7067, 7076.5, 28950299 ],
    [ 1576465200000, 7076.5, 7083, 7056, 7059, 48497059 ],
    [ 1576468800000, 7059, 7063, 7020.5, 7052.5, 142785632 ],
    [ 1576472400000, 7052.5, 7063, 7044, 7056, 23109553 ],
    [ 1576476000000, 7056, 7077, 7055.5, 7068.5, 35976527 ]
  ]
}

beforeEach(() => {
  initializeCandles()
})

test('BBANDS stream calculations should be consistent with BBANDS batch calculations', () => {
  // stream calculation
  let md = ta.marketDataFromCandles([])
  let imd = ta.invertedMarketData(md)
  const bbandsCalculator = bbands(20)
  candles.forEach((c) => {
    md = ta.marketDataAppendCandle(md, c)
    imd = ta.invertedAppendCandle(imd, c)
    bbandsCalculator(md, imd)
  })

  // batch calculation copied and adapted from bin/price
  const marketData         = ta.marketDataFromCandles(candles)
  const indicatorSettings  = ta.id['bbands'](marketData, 20)
  const r                  = talib.execute(indicatorSettings)
  const invertedMarketData = ta.invertedMarketData(marketData)
  ta.invertedAppend(invertedMarketData, 'upperBand',  r.result.outRealUpperBand)
  ta.invertedAppend(invertedMarketData, 'middleBand', r.result.outRealMiddleBand)
  ta.invertedAppend(invertedMarketData, 'lowerBand',  r.result.outRealLowerBand)

  // batch and stream should have the same values
  // console.warn(invertedMarketData.bbands20, imd.bbands20)
  expect(invertedMarketData.upperBand).toEqual(imd.upperBand20)
  expect(invertedMarketData.middleBand).toEqual(imd.middleBand20)
  expect(invertedMarketData.lowerBand).toEqual(imd.lowerBand20)
})
