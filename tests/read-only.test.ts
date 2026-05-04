import assert from 'node:assert/strict'
import test from 'node:test'

import * as ReadOnly from '../src/read-only.js'

const importPackage = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<typeof ReadOnly>

test('read-only entrypoint exposes market data, option chain, dxLink, and calendar APIs', () => {
  assert.equal(typeof ReadOnly.ReadOnlySession, 'function')
  assert.equal(typeof ReadOnly.getMarketDataByType, 'function')
  assert.equal(typeof ReadOnly.getOptionChain, 'function')
  assert.equal(typeof ReadOnly.Option, 'function')
  assert.equal(typeof ReadOnly.DXLinkStreamer, 'function')
  assert.equal(typeof ReadOnly.Quote, 'function')
  assert.equal(typeof ReadOnly.Greeks, 'function')
  assert.equal(typeof ReadOnly.Candle, 'function')
  assert.equal(typeof ReadOnly.getMarketSessions, 'function')
  assert.equal(typeof ReadOnly.isMarketOpenNow, 'function')
})

test('package export map resolves read-only entrypoint after build', async () => {
  const exported = await importPackage('tastytrade-ts-sdk/read-only')

  assert.equal(exported.ReadOnlySession, ReadOnly.ReadOnlySession)
  assert.equal(exported.DXLinkStreamer, ReadOnly.DXLinkStreamer)
  assert.equal(typeof exported.getMarketDataByType, 'function')
  assert.equal(typeof exported.Quote, 'function')
})

test('read-only entrypoint does not export trading, mutation, paper, watchlist, or raw write APIs', () => {
  const forbidden = [
    'Session',
    'Account',
    'NewOrder',
    'OrderAction',
    'placeOrder',
    'replaceOrder',
    'deleteOrder',
    'PrivateWatchlist',
    'createPrivateWatchlist',
    'deletePrivateWatchlist',
    'PaperSession',
    'getCustomer',
    '_post',
    '_put',
    '_delete'
  ]

  for (const name of forbidden) {
    assert.equal(name in ReadOnly, false, `${name} should not be exported from read-only entrypoint`)
  }
})

test('ReadOnlySession can read market data but does not expose mutation helpers', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init })
    if (String(url).endsWith('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
    }
    return new Response(
      JSON.stringify({
        data: {
          items: [{ symbol: 'SPY', 'instrument-type': 'Equity', mark: '500.00' }]
        }
      }),
      { status: 200 }
    )
  }
  const session = new ReadOnly.ReadOnlySession({ providerSecret: 'secret', refreshToken: 'refresh', fetch })

  const data = await ReadOnly.getMarketDataByType(session, { equities: ['SPY'] })

  assert.equal(data[0]?.symbol, 'SPY')
  assert.equal(typeof (session as unknown as { headers?: unknown }).headers, 'undefined')
  assert.equal(typeof (session as unknown as { fetch?: unknown }).fetch, 'undefined')
  assert.equal(typeof (session as unknown as { session_token?: unknown }).session_token, 'undefined')
  assert.equal(typeof (session as unknown as { streamer_token?: unknown }).streamer_token, 'undefined')
  assert.equal(typeof (session as unknown as { _get?: unknown })._get, 'undefined')
  assert.equal(typeof (session as unknown as { _a_get?: unknown })._a_get, 'undefined')
  assert.equal(typeof (session as unknown as { exportSensitiveSessionSnapshot?: unknown }).exportSensitiveSessionSnapshot, 'undefined')
  assert.equal(typeof (session as unknown as { getCustomer?: unknown }).getCustomer, 'undefined')
  assert.equal(typeof (session as unknown as { _post?: unknown })._post, 'undefined')
  assert.equal(typeof (session as unknown as { _put?: unknown })._put, 'undefined')
  assert.equal(typeof (session as unknown as { _delete?: unknown })._delete, 'undefined')
  assert.ok(calls.some((call) => call.url.endsWith('/market-data/by-type?equity=SPY')))
})

test('ReadOnlySession type does not expose raw request or token-bearing internals', () => {
  const session = new ReadOnly.ReadOnlySession({
    providerSecret: 'secret',
    refreshToken: 'refresh',
    fetch: async () => new Response()
  })

  // @ts-expect-error read-only facade intentionally omits raw request access.
  session._get
  // @ts-expect-error read-only facade intentionally omits mutable headers.
  session.headers
  // @ts-expect-error read-only facade intentionally omits session bearer tokens.
  session.session_token
  // @ts-expect-error read-only facade intentionally omits streamer bearer tokens.
  session.streamer_token
})

test('read-only DXLinkStreamer facade does not expose low-level connection internals at runtime', () => {
  const session = new ReadOnly.ReadOnlySession({
    providerSecret: 'secret',
    refreshToken: 'refresh',
    fetch: async () => new Response()
  })
  const streamer = new ReadOnly.DXLinkStreamer(session)
  const forbidden = [
    'websocket',
    '_setup_connection',
    '_authenticate_connection',
    '_channel_request',
    '_channel_setup',
    '_heartbeat',
    'handleMessage'
  ]

  assert.equal(typeof streamer.connect, 'function')
  assert.equal(typeof streamer.close, 'function')
  assert.equal(typeof streamer.subscribe, 'function')
  assert.equal(typeof streamer.unsubscribe, 'function')
  assert.equal(typeof streamer.subscribeCandle, 'function')
  assert.equal(typeof streamer.listen, 'function')
  assert.equal(typeof streamer.getEvent, 'function')

  for (const name of forbidden) {
    assert.equal(name in streamer, false, `${name} should not be exposed from read-only streamer facade`)
    assert.equal(
      typeof (streamer as unknown as Record<string, unknown>)[name],
      'undefined',
      `${name} should not be readable on read-only streamer facade`
    )
  }
})

test('read-only DXLinkStreamer type does not expose low-level connection internals', () => {
  const session = new ReadOnly.ReadOnlySession({
    providerSecret: 'secret',
    refreshToken: 'refresh',
    fetch: async () => new Response()
  })
  const streamer = new ReadOnly.DXLinkStreamer(session)

  // @ts-expect-error read-only facade intentionally omits raw websocket access.
  streamer.websocket
  // @ts-expect-error read-only facade intentionally omits setup internals.
  streamer._setup_connection
  // @ts-expect-error read-only facade intentionally omits token authentication internals.
  streamer._authenticate_connection
  // @ts-expect-error read-only facade intentionally omits channel request internals.
  streamer._channel_request
  // @ts-expect-error read-only facade intentionally omits channel setup internals.
  streamer._channel_setup
  // @ts-expect-error read-only facade intentionally omits heartbeat internals.
  streamer._heartbeat
  // @ts-expect-error read-only facade intentionally omits raw message handling internals.
  streamer.handleMessage
})
