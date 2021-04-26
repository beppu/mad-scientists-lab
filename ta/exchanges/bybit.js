const events = require('events')
const WebSocket = require('ws')
const {DateTime} = require('luxon')
const kindOf = require('kind-of')
const {RestClient, WebsocketClient} = require('bybit-api')
const Bluebird = require('bluebird')
const utils = require('../utils')

class BybitDriver {
  /**
   * Constructor
   * @param {Object} opts options
   * @param {string} opts.key API key
   * @param {string} opts.secret API secret
   * @param {boolean} opts.livenet true to use real exchange, false to use testnet exchange.
   */
  constructor(opts) {
    this.exchangeState = {}
    this.client = new RestClient(opts.key, opts.secret, opts.livenet)
    this.opts = opts
  }

  /**
   * Establish an authenticated websocket connection and setup handlers
   * @param {String} market price data requested
   * @param {Object<String,Function>} handlers
   * @param {Function} handlers.update candle data streams to the update event
   * @param {Function} handlers.response exchange event info streams to the response event
   */
  async connect(market, handlers) {
    const events = ['open', 'reconnected', 'update', 'response', 'close', 'reconnect', 'error']
    this.market = market.replace(/\//, '')
    this.ws = new WebsocketClient({ key: this.opts.key, secret: this.opts.secret, livenet: this.opts.livenet }, utils.nullLogger)
    /*
     * Price needs to be communicated back to the live.Trader (or live.Tester).
     *   'update'
     * Order execution needs to be communicated back.
     *   'response'
     * Disconnection and reconnection need to be communicated back.
     *   'close'
     *   'reconnected'
     */

    /*
     * To make the driver design work for the general case, I need my own events for:
     * - price
     * - execution
     * - reconnected
     */
    events.forEach((ev) => {
      if (handlers[ev]) {
        this.ws.on(ev, handlers[ev].bind(this))
      }
    })
    this.subscribeCandles(market)
    if (this.opts.key && this.opts.secret) {
      this.subscribePrivate()
    }
  }

  subscribeCandles(market) {
    const mkt = market.replace(/\//, '')
    const channel = `klineV2.1.${mkt}`
    this.ws.subscribe(channel)
  }

  subscribePrivate() {
    // test commit
    this.ws.subscribe(['position', 'execution', 'order', 'stop_order'])
  }

  /**
   * Execute a list of order manipulation instructions on the exchange.
   * Results will come back through websockets.
   * @param {Array<Object>} orders - Parameter description.
   */
  async execute(orders) {
    const client = this.client
    let exchangeOrder = {}
    let results = await Bluebird.map(orders, async (order) => {
      switch (order.type) {
      case 'market':
        exchangeOrder.side          = order.action === 'buy' ? 'Buy' : 'Sell';
        exchangeOrder.symbol        = this.market
        exchangeOrder.order_type    = 'Market'
        exchangeOrder.qty           = order.quantity;
        exchangeOrder.time_in_force = order.time_in_force || 'ImmediateOrCancel'
        console.log(exchangeOrder)
        return await client.placeActiveOrder(exchangeOrder)
        break;
      case 'limit':
        exchangeOrder.side          = order.action === 'buy' ? 'Buy' : 'Sell';
        exchangeOrder.symbol        = this.market
        exchangeOrder.order_type    = 'Limit'
        exchangeOrder.qty           = order.quantity
        exchangeOrder.time_in_force = order.opts && order.opts.time_in_force || 'PostOnly'
        exchangeOrder.price         = order.price
        console.log(exchangeOrder)
        return await client.placeActiveOrder(exchangeOrder)
        break;
      case 'stop-market':
        exchangeOrder.side          = order.action === 'buy' ? 'Buy' : 'Sell';
        exchangeOrder.symbol        = this.market
        exchangeOrder.order_type    = 'Market'
        exchangeOrder.base_price    = order.opts && order.opts.base_price // I really hate this.  It's like the current price.
        exchangeOrder.stop_px       = order.price // the price for triggering the stop order.
        exchangeOrder.qty           = order.quantity
        exchangeOrder.time_in_force = order.opts && order.opts.time_in_force || 'GoodTillCancel'
        if (order.reduceOnly) {
          exchangeOrder.close_on_trigger = true
        }
        console.log(exchangeOrder)
        return await client.placeConditionalOrder(exchangeOrder) // FIXME - What method do I really need?
        break;
      case 'modify':
        const id = this.exchangeState.localToRemote[order.id] // TODO - Populate localToRemote
        if (order.action === 'cancel') {
          if (id) {
            return await client.cancelActiveOrder(exchangeOrder)
          } else {
            return new Error(`order.id ${order.id} not found`)
          }
        } else if (order.action === 'update') {
          if (id) {
            const replacementOrder = {
              order_id:  id,
              symbol:    order.symbol,
            }
            if (order.price)
              replacementOrder.p_r_price = order.price
            if (order.quantity) {
              replacementOrder.p_r_qty = order.quantity
            }
            return await client.replaceActiveOrder(replacementOrder)
          } else {
            return new Error(`order.id ${order.id} not found`)
          }
        }
        break
      default:
        return {} // not implemented yet
      }
    });
    // XXX It doesn't make sense to return exchangeState and executedOrders, because in realtime, they comeback through websockets.
    return results
  }

  // Handle websocket events

  /**
   * Handle the WebSocket client's open event with a custom handler if provided.
   */
  handleOpen() {
    if (this.handlers.open) {
      this.handlers.open()
    }
  }

  /**
   * Handle the WebSocket client's open event with a custom handler if provided.
   */
  handleClose() {
    if (this.handlers.close) {
      this.handlers.close()
    }
  }

  /**
   * Handle the WebSocket client's open event with a custom handler if provided.
   */
  handleReconnect() {
    if (this.handlers.reconnect) {
      this.handlers.reconnect()
    }
  }

  /**
   * Handle the WebSocket client's open event with a custom handler if provided.
   */
  handleReconnected() {
    if (this.handlers.reconnected) {
      this.handlers.reconnected()
    }
  }

  /**
   * If an error handler is provided, pass the error to the handler.
   * @param {Object} error - Parameter description.
   */
  handleError(error) {
    if (this.handlers.error) {
      this.handlers.error()
    }
  }

  // The following two handlers are special in that they aren't simple pass-throughs like the previous handlers.
  // handleUpdate - consume candles from the websocket and publish them via a 'price' handler if provided.
  // handleResponse - consume private channels and normalize them into order executions as understood by my strategies.

  /**
   * Run the candle handler when realtime candles come over the websocket.
   * @param {Type of update} update - Parameter description.
   */
  async handleUpdate(update) {
    if (this.handlers.onCandle) {
      const candle = []
      this.handlers.onCandle(candle)
    }
  }

  async handleResponse(response) {
    if (this.handlers.onExecution) {
      const execution = {}
      this.handlers.onExecution(execution)
    }
  }

}

function connect(apiKey) {
  /*
    // connect, subscribe to klines, and pass kline data through my own eventemitter
    // return connected client and eventemitter
    // ---- might want to do something different ----

  const ws = new WebSocket(endpoint)
  const ee = new events.EventEmitter()
  ws.on('open', () => {
    if (apiKey) {
      // authenticate
      const expires = DateTime.local() + 1000
      const signature = "something" // hex(HMAC_SHA256(secret, 'GET/realtime' + expires));
      const login = JSON.stringify({
        op: 'auth',
        args: [ apiKey, expires, signature ]
      })
      // ws.send(login)
    }

    // ask for candles
    const market = 'BTCUSD'
    const klineSubscribe = JSON.stringify({
      op: 'subscribe',
      args: [ `klineV2.1.${market}` ]
    })
    ws.send(klineSubscribe)
  })

  // setup an emitter that will work for any topic
  ws.on('message', (payload) => {
    const data = JSON.parse(payload)
    const topic = data.topic || 'unknown'
    ee.emit(topic, data)
  })

  // TODO - detect disconnections and try to periodically reconnect
  ws.on('close', () => {
  })

  return [ws, ee]
  */
}

async function subscribeCandles(ws, market) {
  const mkt = market.replace(/\//, '')
  const channel = `klineV2.1.${mkt}`
  const klineSubscribe = JSON.stringify({
    op: 'subscribe',
    args: [channel]
  })
  if (ws.readyState) {
    ws.send(klineSubscribe)
  } else {
    ws.on('open', () => {
      ws.send(klineSubscribe)
    })
  }
  return channel
}

const limits = {
  maxCandles: 200
}

const fees = {
  maker: -0.00025, // negative fee is a rebate you get back
  taker: 0.00075
}

//ws.send(JSON.stringify({ op: 'unsubscribe', args: [ 'klineV2.1.BTCUSD' ] }))

// I'm not sure what the websocket side should look like yet.
// Initially, I want to pull down public candlestick data that doesn't require authentication.
// However, for trading, I need access to private websocket topics too.

module.exports = {
  limits,
  fees
}

module.exports.Driver = BybitDriver

/*
  // OLD
  // instantiate a client
  $e = process.env
  bliv = exchanges.bybit.create({ baseURL: $e.TA_BYBIT_API_URL, key: $e.TA_BYBIT_API_KEY, secret: $e.TA_BYBIT_API_SECRET })
  orders = [{ type: 'limit', action: 'buy', quantity: 1, price: 10500 }]
  bliv(orders).then(cl).catch(console.error)

  $e = process.env
  BybitAPI = require('bybit-api')
  client = new BybitAPI.RestClient($e.TA_BYBIT_API_KEY, $e.TA_BYBIT_API_SECRET, false) // false for testnet, true for live
 */

/**
 * WebSocket Architecture (updated)

   use an eventemitter to communicate from websocket to live.js
   subscribe to kline to get candles
     feed candles to livetester or livetrader
   subscribe to private feeds to get order execution
     feed order execution results to the same but on a different eventemitter key

   The API I had before (that I actually uesd) was a connect function that returned a [client, eventemitter] pair.
   I also had subscribeCandles which I used and subscribePrivate which I didn't get around to implementing.
   I may want to try something different.  I think I need to log into my server and play with this new lib to feel it out.
   This client emits its own events, and I could maybe do away with my own eventemitter.

   The functions are poorly named, because the idea was not clear in my mind.
   bybit.create returns an order stream executing function.
     It should have a more descriptive name than create.
   bybit.connect returns a websocket client and an eventemitter which might not be needed.
     I just need a websocket client setup with the right handlers which don't need to change once setup.
     kline handling should be generic.
     order handling should be generic too.

   The big problem is that the rest side (hidden behind the order executing function) and the websocket side
   need to share order data.  I need to be able to map my local ids to their ids.

   How tf do I organize that?
   There is some client state that may need to get passed around.
   For example, the mapping between local order ids and exchange order ids may need to be maintained.

   Maybe I should just make a driver class.

*/

/**
 * New

 key = process.env.TA_BYBIT_API_KEY
 secret = process.env.TA_BYBIT_API_SECRET
 livenet = false
 bb = new exchanges.bybit.Driver({ key, secret, livenet })

 */
