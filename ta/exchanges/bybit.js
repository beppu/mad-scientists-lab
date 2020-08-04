const events = require('events')
const WebSocket = require('ws')
const {DateTime} = require('luxon')
const kindOf = require('kind-of')
const bybit = require('bybit')
const Bluebird = require('bluebird')

const WEBSOCKET_ENDPOINT = 'wss://stream.bybit.com/realtime'

function create(options) {
  let exchangeState = {}
  let executedOrders = []
  const client = bybit({
    baseURL: options.baseURL,
    key:     options.key,
    secret:  options.secret
  })

  return async function bybit(orders) {
    let exchangeOrder = {};
    let results = await Bluebird.map(orders, async (order) => {
      switch (order.type) {
      case 'market':
        exchangeOrder.side   = order.action === 'buy' ? 'Buy' : 'Sell';
        exchangeOrder.symbol = order.symbol
        exchangeOrder.qty    = order.quantity;
        return await client.createOrder(exchangeOrder)
        break;
      case 'limit':
        exchangeOrder.side   = order.action === 'buy' ? 'Buy' : 'Sell';
        exchangeOrder.symbol = order.symbol
        exchangeOrder.qty    = order.quantity
        exchangeOrder.price  = order.price
        return await client.createOrder(exchangeOrder)
        break;
      case 'modify':
        const id = exchangeState.localToRemote[order.id] // TODO - Populate localToRemote
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
            return await client.post('/open-api/order/replace', replacementOrder)
          } else {
            return new Error(`order.id ${order.id} not found`)
          }
        }
        break
      default:
        return {} // not implemented yet
      }
    });
    return [exchangeState, executedOrders]
  }
}

const _ping = JSON.stringify({ op: 'ping' })
function pingAtInterval(ws, interval=30000) {
  return setInterval(() => {
    if (ws.readyState) {
      ws.send(_ping)
    }
  }, interval)
}

function connect(apiKey, endpoint=WEBSOCKET_ENDPOINT) {
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

async function subscribePrivate(ws) {
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
  WEBSOCKET_ENDPOINT,
  create,
  pingAtInterval,
  connect,
  subscribeCandles,
  subscribePrivate,
  limits,
  fees
}

/*
  // instantiate a client
  $e = process.env
  bliv = exchanges.bybit.create({ baseURL: $e.TA_BYBIT_API_URL, key: $e.TA_BYBIT_API_KEY, secret: $e.TA_BYBIT_API_SECRET })
  orders = [{ type: 'limit', action: 'buy', quantity: 1, price: 10500 }]
  bliv(orders).then(cl).catch(console.error)
 */
