const events = require('events')
const WebSocket = require('ws')
const {DateTime} = require('luxon')
const kindOf = require('kind-of')
const {InverseClient, WebsocketClient} = require('bybit-api')
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
    this.exchangeState = { orders: {}, stopOrders: {} }
    this.client = new InverseClient(opts.key, opts.secret, opts.livenet)
    this.opts = opts
    this.handlers = {}
  }

  /**
   * Establish an authenticated websocket connection and setup handlers
   * @param {String} market price data requested
   * @param {Object<String,Function>} handlers
   * @param {Function} handlers.candle candle data streams to the update event
   * @param {Function} handlers.execution exchange event info streams to the response event
   */
  async connect(market, handlers) {
    this.handlers.candle = handlers.candle
    this.handlers.execution = handlers.execution
    const events = ['open', 'reconnected', 'update', 'response', 'close', 'reconnect', 'error']
    this.market = market.replace(/\//, '')
    this.ws = new WebsocketClient({ key: this.opts.key, secret: this.opts.secret, livenet: this.opts.livenet }, utils.nullLogger)
    // Raw event handlers that come straight from the exchange
    events.forEach((ev) => {
      if (handlers[ev]) {
        this.ws.on(ev, handlers[ev].bind(this))
      }
    })
    // Standardized/Simplified Events
    this.ws.on('update', this.handleUpdate.bind(this))
    this.subscribeCandles(market)
    if (this.opts.key && this.opts.secret) {
      this.subscribePrivate()
    }
  }

  /**
   * Subscribe to price updates that will be reported back on the update event.
   * @param {String} market - market to subscribe to in $COIN/$BASE_CURRENCY format (with the slash)
   */
  subscribeCandles(market) {
    const mkt = market.replace(/\//, '')
    const channel = `klineV2.1.${mkt}`
    this.ws.subscribe(channel)
  }

  /**
   * Subscribe to all private channels
   * - position:   current position report
   * - execution:  order fills and cancellations
   * - order:      when a limit order is accepted or rejected
   * - stop_order: when a stop order is accepted or rejected
   */
  subscribePrivate() {
    this.ws.subscribe(['position', 'execution', 'order', 'stop_order'])
  }

  /**
   * Execute a list of order manipulation instructions on the exchange.
   * Results will come back through websockets.
   * @param {Array<Object>} orders - Parameter description.
   */
  async execute(orders) {
    const client = this.client
    let results = await Bluebird.map(orders, async (order) => {
      let exchangeOrder = {}
      switch (order.type) {
      case 'market':
        if (order.id) {
          exchangeOrder.order_link_id = order.id
        }
        exchangeOrder.side          = order.action === 'buy' ? 'Buy' : 'Sell';
        exchangeOrder.symbol        = this.market
        exchangeOrder.order_type    = 'Market'
        exchangeOrder.qty           = order.quantity;
        exchangeOrder.time_in_force = order.time_in_force || 'ImmediateOrCancel'
        //console.log(exchangeOrder)
        return await client.placeActiveOrder(exchangeOrder)
        break;
      case 'limit':
        if (order.action === 'cancel') {
          exchangeOrder.order_link_id = order.id
          exchangeOrder.symbol = this.market
          return await client.cancelActiveOrder(exchangeOrder)
        }
        if (order.action === 'update') {
          exchangeOrder.order_link_id = order.id
          exchangeOrder.symbol = this.market
          if (order.price) {
            exchangeOrder.p_r_price = order.price
          }
          if (order.quantity) {
            exchangeOrder.p_r_qty = order.quantity
          }
          return await client.replaceActiveOrder(exchangeOrder)
        }
        if (order.action === 'buy') {
          exchangeOrder.side = 'Buy'
        }
        if (order.action === 'sell') {
          exchangeOrder.side = 'Sell'
        }
        exchangeOrder.symbol        = this.market
        exchangeOrder.order_type    = 'Limit'
        exchangeOrder.qty           = order.quantity
        exchangeOrder.time_in_force = order.opts && order.opts.time_in_force || 'PostOnly'
        exchangeOrder.price         = order.price
        if (order.reduceOnly) {
          exchangeOrder.close_on_trigger = true
        }
        if (order.id) {
          exchangeOrder.order_link_id = order.id
        }
        //console.log(exchangeOrder)
        return await client.placeActiveOrder(exchangeOrder)
        break;
      case 'stop-market':
        if (order.action === 'cancel') {
          if (order.id) {
            exchangeOrder.order_link_id = order.id
          }
          exchangeOrder.symbol = this.market
          return await client.cancelConditionalOrder(exchangeOrder)
        }
        if (order.action === 'update') {
          if (order.id) {
            exchangeOrder.order_link_id = order.id
          }
          exchangeOrder.symbol = this.market
          if (order.price) {
            exchangeOrder.p_r_trigger_price = order.price
          }
          if (order.quantity) {
            exchangeOrder.p_r_qty = order.quantity
          }
          return await client.replaceConditionalOrder(exchangeOrder)
        }
        if (order.action === 'buy') {
          exchangeOrder.side = 'Buy'
        }
        if (order.action === 'sell') {
          exchangeOrder.side = 'Sell'
        }
        exchangeOrder.symbol        = this.market
        exchangeOrder.order_type    = 'Market'
        exchangeOrder.base_price    = order.opts && order.opts.base_price // I really hate this.  It's like the current price.
        exchangeOrder.stop_px       = order.price // the price for triggering the stop order.
        exchangeOrder.qty           = order.quantity
        exchangeOrder.time_in_force = order.opts && order.opts.time_in_force || 'GoodTillCancel'
        if (order.reduceOnly) {
          exchangeOrder.close_on_trigger = true
        }
        if (order.id) {
          exchangeOrder.order_link_id = order.id
        }
        //console.log(exchangeOrder)
        return await client.placeConditionalOrder(exchangeOrder) // FIXME - What method do I really need?
        break;
      default:
        return {} // not implemented yet
      }
    });
    // XXX It doesn't make sense to return exchangeState and executedOrders, because in realtime, they comeback through websockets.
    return results
  }

  // Handle websocket events

  /**
   * Both candles and order execution comes through the `update` topic.
   * @param {Object} update - this is an event from the websocket.
   */
  async handleUpdate(update) {
    let type
    if (update.topic && update.topic.match(/^kline/)) {
      type = 'candle'
    } else {
      type = 'execution'
    }
    switch (type) {
      case 'candle':
        if (this.handlers.candle) {
          const candles = update.data
          this.handlers.candle(candles)
        }
        break;
      case 'execution':
        if (this.handlers.execution) {
          const events = this.transformExchangeEvents(update)
          this.handlers.execution(events)
        }
        break;
      default:
    }
  }

  /**
   * Transform bybit exchange events into simplified ta exchange events that strategies can consume.
   * @param {Object} ev - an object that came from the WebSocket's update topic
   * @param {String} ev.topic - the private topic that the event was emitted on
   * @param {Array<Object>} ev.data - the data from the event
   * @return {Array<Object>} - an array of simplified exchange events
   */
  transformExchangeEvents(ev) {
    switch (ev.topic) {
    case 'position':
      return ev.data.map((p) => {
        let position = {
          type:      'position',
          symbol:    p.symbol,
          side:      p.side,
          entry:     p.entry_price,
          value:     p.position_value,
          balance:   p.wallet_balance,
          available: p.available_balance,
          _:         p // save the original in _
        }
        return position
      })
      break
    case 'order':
      // Here, the exchange will let you whether it accepted or rejected a request.  ack/nack.
      // You can also find the exchange-assigned order_id here.
      // My simulator doesn't do anything with this, but it should.
      const orderAcks = []
      ev.data.forEach((o) => {
        this.exchangeState.orders[o.order_id] = o
        let ack = {
          type:     o.order_type.toLowerCase(),
          action:   o.side.toLowerCase(),
          quantity: o.qty,
          status:   'created',    // TODO or 'rejected'
          _id:      o.order_id    // send back the exchange generated order_id
        }
        if (o.order_link_id) {
          ack.id = o.order_link_id
        }
        orderAcks.push(ack)
      })
      return orderAcks
      break
    case 'stop_order':
      // Similar to order, but for conditional orders.
      const stopOrderAcks = []
      ev.data.forEach((so) => {
        this.exchangeState.stopOrders[so.order_id] = so
        let ack = {
          type:     `stop-${so.order_type.toLowerCase()}`,
          action:   so.side.toLowerCase(),
          quantity: so.qty,
          status:   'created',    // TODO or 'rejected'
          _id:      so.order_id   // send back the exchange generated order_id
        }
        if (so.order_link_id) {
          ack.id = so.order_link_id
        }
        stopOrderAcks.push(ack)
      })
      return stopOrderAcks
      break
    case 'execution':
      // When an order is filled or executed, the `execution` topic is where it's communicated.
      // This is the only part that strategies want so far, but they should want the
      // other things too for completeness.
      // I may have to redo some strategies and parts of the simulator to bring this more in line
      // with how bybit works.
      return ev.data.map((e) => {
        let type, order
        if (this.exchangeState.orders[e.order_id]) {
          order = this.exchangeState.orders[e.order_id]
          type = order.order_type.toLowerCase()
        }
        if (this.exchangeState.stopOrders[e.order_id]) {
          order = this.exchangeState.stopOrders[e.order_id]
          type = `stop-${order.order_type.toLowerCase()}` // almost always 'stop-market' in my case
        }
        const exec = {
          type,
          _id:      e.order_id,
          status:   'filled',
          action:   e.side.toLowerCase(),
          quantity: e.exec_qty,
          price:    e.price,
          _:        e
        }
        if (e.order_link_id) exec.id = e.order_link_id
        return exec
      })
      break
    }
    // It should never get here.
    return []
  }
}

const limits = {
  maxCandles: 200
}

const fees = {
  maker: -0.00025, // negative fee is a rebate you get back
  taker: 0.00075
}

module.exports = {
  limits,
  fees,
  Driver: BybitDriver
}

/**

 // Instantiate the driver for debugging `candle` and `execution` handlers
 pino = require('pino')
 uuid = require('uuid')
 xlog = pino(pino.destination('x.log'))
 xs = []
 lastCandle = undefined
 function candle(cs) {
  lastCandle = cs[cs.length - 1]
 }
 function execution(orders) {
  console.log('xs', orders)
  xs.push(...orders)
  orders.forEach((o) => xlog.info(o))
 }
 key = process.env.TA_BYBIT_API_KEY
 secret = process.env.TA_BYBIT_API_SECRET
 livenet = false
 bb = new exchanges.bybit.Driver({ key, secret, livenet })
 bb.connect('BTC/USD', { candle, execution })

 */
