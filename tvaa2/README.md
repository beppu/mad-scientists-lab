# tvaa2

TradingView Alert Amplifier 2

## Why?

* I need a little more power than [webhook](https://github.com/adnanh/webhook) can offer.
* Analysis and alerts have to be able to run on different machines.
  - Analysis has to run all the time on a computer that stays up most of the time.
  - Alerts need to run on devices that are physically close to me that can make noise.
  - The system is currently made so everything runs on the same system, and that's not going to cut it.
* I also want to see what kind of JSON TradingView has been sending me, and webhook doesn't let me see that easily.
* I want to generalize the routing and audio playing code.

## How?

* [zeit/micro](https://github.com/zeit/micro)
* [jesseditson/fs-router](https://github.com/jesseditson/fs-router)

## What else?

Some of the code from bin/alert that does the actual alerting might get moved here.
I'm going to have to think about this more.

- I want the server-side to maintain a record of what alerts have happened.
- Audio should be done in tvaa2 and not by bin/alert anymore.
- The job of bin/alert should be to send messages via webhooks or push notifications or whatever.
- The receivers of those messages can interpret them in a humanly useful way.
