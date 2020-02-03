# tvaa2

TradingView Alert Amplifier 2 - Accept webhook requests from TradingView and make loud noises so that I notice.

## Why?

* I need a little more power than [webhook](https://github.com/adnanh/webhook) can offer.
* Analysis and alerts have to be able to run on different machines.
  - Analysis has to run all the time on a computer that stays up most of the time.
  - Alerts need to run on devices that are physically close to me that can make noise.
  - The system is currently made so everything runs on the same system, and that's not going to cut it.
* I also want to see what kind of estra data TradingView has been sending me, and webhook doesn't let me see that easily.
* I want to generalize the routing and audio playing code.

## How?

* [zeit/micro](https://github.com/zeit/micro)
* [jesseditson/fs-router](https://github.com/jesseditson/fs-router)

## What else?

Some of the code from bin/alert that does the actual alerting might get moved here.
I'm going to have to think about this more.

### What should bin/alert's job be?

`bin/alert` runs on a server, and it encapsulates the essence of an alert.

* exchange
* market
* timeframe
* message

It sends this information to tvaa2 so that a human can become aware of the alert.

**Question**:  Should logging and database writing be done by `bin/alert` or by tvaa2?

**Answer**:  I think it should be done by `bin/alert`, because it will be running on a
server, and it's a lot less likely for it to miss recording data.  Computers running tvaa2
are not guaranteed to be online.

`bin/alert`'s delivery methods should be:

* webhook
* database
* log file (optional)
* push notification (TODO)
* slack (TODO)

#### Changes to be made

* Stop making noise.
* Send data with the webhook request.
* Add slack and push notifications.

### What should tvaa2's job be?

The responsibility of tvaa2 is to get a human's attention when an alert
happens.  This will be done using the following methods:

* mplayer
* espeak
* desktop notifications

Make some noise, so I can look at interesting developments in the market.

#### Changes to be made

* Add espeak support
* Add desktop notification support
