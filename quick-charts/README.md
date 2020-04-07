# Quick Charts

This is a web app that will draw charts for you in a browser.  Later, it should
be able to screenshot those charts and save them back to the server.  Instructions
to draw and screenshot will be sent to its REST endpoints.

## Why?

While debugging my trading strategies, I want to know the details behind the
decisions it makes, and it'd be nice if I could see those details in the form
of an annotated candlestick chart.  TradingView throws away low timeframe data
that's too far in the past, so there's a limit to the kind of debugging I can
do with TradingView's help.

## Building Blocks

* [Next.js](https://nextjs.org/)
* [react-apexcharts](https://github.com/apexcharts/react-apexcharts)
* [html2canvas](https://github.com/niklasvh/html2canvas)
* [socket.io](https://socket.io/)
