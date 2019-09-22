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
