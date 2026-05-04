import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AccountBalance,
  AlertStreamer,
  DXLinkStreamer,
  MAP_ALERTS_REVERSE,
  MAP_EVENTS_REVERSE,
  Quote,
  QuoteAlert,
  Session,
  versionStr,
  type WebSocketLike
} from '../src/index.js'

class MockSocket implements WebSocketLike {
  sent: string[] = []
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onclose: ((event: unknown) => void) | null = null

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {}
}

test('AlertStreamer sends tastyware account subscription message', async () => {
  const socket = new MockSocket()
  const session = new Session({
    providerSecret: 'secret',
    refreshToken: 'refresh',
    fetch: async () => new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
  })
  const streamer = new AlertStreamer(session, () => socket)
  streamer.connect()

  await streamer.subscribeAccounts([{ account_number: '5WT00000' }])

  assert.deepEqual(JSON.parse(socket.sent[0]!), {
    'auth-token': 'Bearer token-1',
    action: 'connect',
    'request-id': 1,
    source: versionStr,
    value: ['5WT00000']
  })
})

test('AlertStreamer supports Python snake_case subscriptions and typed alert mapping', async () => {
  const socket = new MockSocket()
  const session = new Session({
    providerSecret: 'secret',
    refreshToken: 'refresh',
    fetch: async () => new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
  })
  const streamer = new AlertStreamer(session, () => socket)
  streamer.connect()

  await streamer.subscribe_quote_alerts()
  streamer.handleMessage({
    type: 'QuoteAlert',
    data: {
      symbol: 'SPY',
      'threshold-numeric': '575.25'
    }
  })

  const quoteAlert = (await first(streamer.listen(QuoteAlert))) as QuoteAlert
  assert.equal(JSON.parse(socket.sent[0]!).action, 'quote-alerts-subscribe')
  assert.equal(MAP_ALERTS_REVERSE.get(QuoteAlert), 'QuoteAlert')
  assert.equal(quoteAlert.symbol, 'SPY')
  assert.equal(quoteAlert.threshold_numeric!.toString(), '575.25')
})

test('AlertStreamer maps account alerts to account module models', async () => {
  const streamer = new AlertStreamer(
    new Session({
      providerSecret: 'secret',
      refreshToken: 'refresh',
      fetch: async () => new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
    }),
    () => new MockSocket()
  )
  streamer.handleMessage({
    type: 'AccountBalance',
    data: {
      'account-number': '5WT',
      'pending-cash': '7.50',
      'pending-cash-effect': 'Debit'
    }
  })

  const balance = (await first(streamer.listen(AccountBalance))) as AccountBalance

  assert.ok(balance instanceof AccountBalance)
  assert.equal(MAP_ALERTS_REVERSE.get(AccountBalance), 'AccountBalance')
  assert.equal(balance.pending_cash, '-7.50')
})

test('DXLinkStreamer maps FEED_DATA messages into event queues', async () => {
  const socket = new MockSocket()
  const streamer = new DXLinkStreamer(dxSession(), () => socket)

  await connectAndAuthorize(streamer, socket)
  streamer.handleMessage({
    type: 'FEED_DATA',
    data: ['Quote', ['SPY', 0, 0, 0, 0, 'Q', 0, 'Q', 576.88, 576.9, 230.0, 300.0]]
  })

  const quote = (await streamer.getEvent(Quote)) as Quote
  assert.equal(quote.bid_price.toString(), '576.88')
  assert.equal(JSON.parse(socket.sent[0]!).type, 'SETUP')
  assert.equal(MAP_EVENTS_REVERSE.get(Quote), 'Quote')
})

test('DXLinkStreamer connect waits for AUTH_STATE AUTHORIZED before resolving', async () => {
  const socket = new MockSocket()
  const streamer = new DXLinkStreamer(dxSession(), () => socket)

  let connected = false
  const connecting = streamer.connect().then(() => {
    connected = true
  })
  await waitForSent(socket, 1)
  assert.equal(JSON.parse(socket.sent[0]!).type, 'SETUP')
  await streamer.handleMessage({ type: 'SETUP' })
  await waitForSent(socket, 2)
  assert.equal(JSON.parse(socket.sent[1]!).type, 'AUTH')
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(connected, false)
  await streamer.handleMessage({ type: 'AUTH_STATE', state: 'AUTHORIZED' })
  await connecting
  assert.equal(connected, true)

  const request = streamer._channel_request('Quote')
  await waitForSent(socket, 4)
  assert.equal(JSON.parse(socket.sent.at(-1)!).type, 'CHANNEL_REQUEST')
  streamer.handleMessage({ type: 'CHANNEL_OPENED', channel: 7 })
  await request

  assert.deepEqual(
    socket.sent.map((message) => JSON.parse(message).type),
    ['SETUP', 'AUTH', 'KEEPALIVE', 'CHANNEL_REQUEST', 'FEED_SETUP']
  )
  await streamer.close()
})

test('DXLinkStreamer supports nowait reads and candle unsubscribe messages', async () => {
  const socket = new MockSocket()
  const streamer = new DXLinkStreamer(dxSession(), () => socket)

  await connectAndAuthorize(streamer, socket)
  assert.equal(streamer.get_event_nowait(Quote), null)
  await streamer.unsubscribe_candle('SPY', '5m')

  assert.deepEqual(JSON.parse(socket.sent.at(-1)!), {
    type: 'FEED_SUBSCRIPTION',
    channel: 1,
    remove: [{ symbol: 'SPY{=5m,tho=true}', type: 'Candle' }]
  })
})

function dxSession(): Session {
  return new Session({
    providerSecret: 'secret',
    refreshToken: 'refresh',
    fetch: async (url) => {
      if (String(url).endsWith('/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
      }
      return new Response(JSON.stringify({ data: { token: 'dx-token', 'dxlink-url': 'wss://dx.example' } }), {
        status: 200
      })
    }
  })
}

async function connectAndAuthorize(streamer: DXLinkStreamer, socket: MockSocket): Promise<void> {
  const connecting = streamer.connect()
  await waitForSent(socket, 1)
  await streamer.handleMessage({ type: 'SETUP' })
  await waitForSent(socket, 2)
  await streamer.handleMessage({ type: 'AUTH_STATE', state: 'AUTHORIZED' })
  await connecting
}

async function waitForSent(socket: MockSocket, count: number): Promise<void> {
  for (let index = 0; index < 100; index += 1) {
    if (socket.sent.length >= count) return
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  throw new Error(`Expected ${count} sent messages, got ${socket.sent.length}`)
}

async function first<T>(iterable: AsyncIterable<T>): Promise<T> {
  for await (const item of iterable) return item
  throw new Error('No item')
}
