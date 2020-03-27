# Techniques

The code that lives here exists to support strategies.  There are a few categories of code that I envision
living here, and some of them may even seem to be microstrategies of their own.


## Order Management

### Exiting

Once I open a position, I want to have reusable microstrategies for closing a position in an orderly manner.

* For a trending market, there might be an implementation of Chandelier Stops.
* For a scalping strategy, it could exit aggressively on touches of the bbands or low timeframe divergences.
* A traditional trailing stop could be useful too.
* Maybe resistances could be scanned for and limit orders placed ahead of time near each resistance for a multi-tiered exit.

### Entering

I may also want to have different ways to open a position.

* One way is to market buy immediately.
* Another way is to place limit buy orders and once they're filled, hand it over to an exit microstrategy.
* Maybe my ideas about a Guppy EMA-based "late" entry could go here.


## Bias Detection

Is the overall trend bullish or bearish?  There are various criteria I could use for answering that question.

* Are we above or below the 1d 200 SMA?  (Perhaps other moving averages could be used here as well.)
* Have we made higher lows or lower highs?  (I have a bband-based approach for doing peak and valley detection that I use for divergence that could also be used here.)

The purpose of having a bias is to inform the strategy to change modes.  For example, in a bullish market,
bullish setups tend to work well.  However, once a market turns bearish, their effectiveness tends to be diminished.
A strategy could use bias as a hint to fine tune its actions.
