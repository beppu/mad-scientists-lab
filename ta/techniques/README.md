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


## Position Sizing

Something that I'm woefully ignorant about is the art of position sizing.  In the event that I learn
how to size my positions efficiently, that kind of code may live here.
