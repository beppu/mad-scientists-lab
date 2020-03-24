Maybe this is where the library versions of my bin scripts lives.
If I want to detect divergence, or guppy color chanes, maybe there will be code here
that I can require and use to find what I'm looking for.
Even something as simple as a cross-up or cross-down could go here.
Anything that looks at `invertedMarketData` and returns a discrete value could go here.
Values like [true, false] or [green, gray, red] are appropriate.
Even [green, gray, red] could be distilled into booleans if you ask something like "Is it green?".

What is not appropriate here is numeric values, especially if they need to be stored in `invertedMarketData`.
Nothing here should store data in `invertedMarketData`.  These functions are for analyzing it.
