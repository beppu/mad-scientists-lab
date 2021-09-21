# REPL

## Usage

Start the REPL

```sh
bin/repl
```

Do some interesting things in the REPL

```js
specs = { '30m': [['heikinAshi'], ['ema', 12], ['ema', 26]] }
md = await pipeline.load('bybit', 'BTC/USD', indicatorSpecs)
```

## Convenience Functions

### ok(object)

Object.keys(object)

### cl(args)

console.log(args)

### rl(module)

'rl' stands for 'reload'.  This is like require, but it forces a fresh load.  However, it isn't recursive.
If there's a nested require, it won't force a fresh load on those nested dependencies -- only the top level
module that you named will be freshly reloaded.

### marketData = await pipeline.load(exchange, market, indicatorSpecs, since)

Use the pipeline to populate marketData.

### time.iso(ms)

### time.dt(ms)

### time.dti(isoDateString)

## Hacking

### .repl.js

Everything that's preloaded into the REPL is defined in this file.

