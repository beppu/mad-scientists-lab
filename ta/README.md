# ta

The Unix Philosophy meets Technical Analysis

## Getting Started

```sh
git clone https://github.com/beppu/mad-scientists-lab.git
cd mad-scientists-lab/ta
yarn
```

## Utilities

This package provides command line utilities that can perform some simple but useful
technical analysis.  They will all share a few environment variables and command line
parameters in common to make them work together consistently.

### Common Environment Variables

`TA_EXCHANGE` - The name of the exchange to pull data from.

`TA_MARKET` - The name of the market in the exchange to pull data from.

`TA_TIMEFRAME` - The candlestick duration for the market data.

If a `.env` file exists, it will be honored and loaded into the environment.

### Common Command Line Options

`-x, --exchange <NAME>`

`-m, --market <SYMBOL>`

`-t, --timeframe <INTERVAL>`

These are the same as the above environment variables.  If the environment variable exists,
it will be used.  However, these command line options can override them.  In most cases, all
3 of these are required before any data fetching and analysis can begin.

`-s, --scan` - Instead of checking only the most recent instant in time, scan backwards to find
all the times this condition was met given our data set.  If any matches were found, output them as
a JSON array and exit with code 0.  Otherwise, exit 1.

### Common Exit Codes

| Exit Code | Meaning                                    |
|      ---: | :---                                       |
|         0 | Success, a match was found                 |
|         1 | Failure, no matches were found             |
|       255 | Failure before analysis could be completed |

### bin/price

```
Usage: price [options] <MOVING_AVERAGE> <PERIOD>

Is the price greater-than/less-than a given moving average?

Options:
  -V, --version               output the version number
  -x, --exchange <NAME>       Exchange to pull data from
  -m, --market <SYMBOL>       Market in exchange to pull data from
  -t, --timeframe <INTERVAL>  Candlestick duration for market data
  -g, --gt                    Greater than
  -l, --lt                    Less than
  -s, --scan                  Scan for all occurrences
  -h, --help                  output usage information

```

#### Examples

Find candles where XLM/USDT's price crossed above its 2 hour 200 SMA.

```sh
bin/price --exchange binance --market XLM/USDT --timeframe 2h --gt sma 200 --scan | jq .
```

Output:

```json
[
  [
    1568721600000,
    0.05863,
    0.06058,
    0.05859,
    0.06039,
    10938012,
    "2019-09-17T05:00:00.000-07:00"
  ]
]
```

### bin/aligned

```
Usage: aligned [options] <MOVING_AVERAGE> <PERIOD>..>

Are the given MAs aligned from highest value to lowest value?

Options:
  -V, --version               output the version number
  -x, --exchange <NAME>       Exchange to pull data from (default: "binance")
  -m, --market <SYMBOL>       Market in exchange to pull data from (default: "XLM/USDT")
  -t, --timeframe <INTERVAL>  Candlestick duration for market data
  -s, --scan                  Scan for all occurrences
  -n, --now                   Are they aligned now regardless of the past
  -h, --help                  output usage information
```

#### Examples

Find candles where ETH/BTC's SMA 50, 100, and 200 on the 1h timeframe are aligned in a bullish posture

```sh
bin/aligned --exchange binance --market ETH/BTC --timeframe 1h sma 50 100 200 --scan | jq -c .[]
```

Output:

```json
[1568116800000,0.017671,0.017711,0.01766,0.017678,3272.16,"2019-09-10T05:00:00.000-07:00"]
[1568512800000,0.018231,0.018249,0.018161,0.018166,3307.952,"2019-09-14T19:00:00.000-07:00"]
```

Note that the first candle is a little late, because the data necessary to calculate sma 200 back that far
didn't exist, so sma 200 was undefined for us at the moment a few hours prior where the real alignment happened.
Howeer, the second one is correct.

Find candles where ETH/BTC's EMA 50, 100, and 200 on the 5m timeframe are aligned in a bearish posture

```sh
bin/aligned --exchange binance --market ETH/BTC --timeframe 1h sma 200 100 50 --scan | jq -c .[]
```

Output:

```json
[1569078300000,0.021667,0.021706,0.021658,0.021686,603.57,"2019-09-21T08:05:00.000-07:00"]
[1569114300000,0.021444,0.02146,0.021342,0.021443,801.85,"2019-09-21T18:05:00.000-07:00"]
```

Again, the first value is off due to the lack of data, but the second one finds a relatively safe short entry.
