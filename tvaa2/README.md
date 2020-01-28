# tvaa2

TradingView Alert Amplifier 2

## Why?

* I need a little more power than [webhook](https://github.com/adnanh/webhook) can offer.
* Analysis and alerts have to be able to run on different machines.
  - Analysis has to run all the time on a computer that stays up most of the time.
  - Alerts need to run on devices that are physically close to me.
  - The system is currently made so everything runs on the same system, and that's not going to cut it.
* I want to see what kind of JSON TradingView has been sending me, and webhook doesn't let me see that easily.

## How?

* [zeit/micro](https://github.com/zeit/micro)
* [jesseditson/fs-router](https://github.com/jesseditson/fs-router)

## What else?

Some of the code from bin/alert that does the actual alerting might get moved here.
I'm going to have to think about this more.
