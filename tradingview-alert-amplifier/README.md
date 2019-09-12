# TradingView Alert Amplifier

This script will run [webhook](https://github.com/adnanh/webhook) with a
configuration that will play a WAV file when a request to
http://localhost:5000/hooks/alert is made.  This is intended to be used in conjunction
with TradingView's alert webhooks.

On August 21, 2019 [TradingView added webhook support](https://www.tradingview.com/blog/en/webhooks-for-alerts-now-available-14054/)
for their alerts.  This is great, because you can make TradingView alerts
trigger actions that you define.  I'd be really happy if I could hear these
alerts loud and clear and in a timely fashion.  My phones email and text
message notifications aren't intrusive enough, and even if you have a desktop
browser with the TradingView chart open, the alert might not make a noise if
Chrome deems the tab that it's in to be inactive.

A webhook that plays a sound can solve this.

## Usage

First, run the webhook server.

```sh
./run
```

Second, create a reverse ssh-tunnel using [Serveo](https://serveo.net/) which is a great free ssh tunneling service.

```sh
ssh -o ServerAliveInterval=60 -R 80:localhost:5000 serveo.net
```

Finally, when setting up alerts in TradingView, use the webhook URL:

```
http://$hostname.serveo.net/hooks/alert
```

Replace `$hostname` with the subdomain that was assigned to you by serveo.net.  Also, if you have
access to your own server, you can use that instead of serveo.net.

## Sounds Not Included

To hear anything, `sounds/default.wav` must exist.  You can download WAV files
from sites like https://freesound.org/ and copy (or symlink) them into place.
