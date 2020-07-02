const events = require('events')
const WebSocket = require('ws')
const {DateTime} = require('luxon')
const kindOf = require('kind-of')
const bybit = require('bybit')

const WEBSOCKET_ENDPOINT = 'wss://stream.bybit.com/realtime'

function create(options) {
  let exchangeState = {}
  let executedOrders = []

  return function bybit(orders) {
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
  limits
}

