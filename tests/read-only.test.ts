import assert from 'node:assert/strict'
import test from 'node:test'

import * as Root from '../src/index.js'
import * as ReadOnly from '../src/read-only.js'

const importPackage = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<Record<string, unknown>>

const forbiddenReadOnlyExports = [
  'Session',
  'LowLevelReadOnlySession',
  'LowLevelReadOnlySessionLike',
  'Account',
  'OrderAction',
  'OrderStatus',
  'OrderTimeInForce',
  'OrderType',
  'ComplexOrderType',
  'FillInfo',
  'Leg',
  'buildLeg',
  'TradeableTastytradeData',
  'Message',
  'OrderConditionPriceComponent',
  'OrderCondition',
  'OrderRule',
  'AdvancedInstructions',
  'NewOrder',
  'NewComplexOrder',
  'PlacedOrder',
  'PlacedComplexOrder',
  'BuyingPowerEffect',
  'FeeCalculation',
  'PlacedOrderResponse',
  'PlacedComplexOrderResponse',
  'OrderPlacementOptions',
  'DeleteOrderIntent',
  'DeleteComplexOrderIntent',
  'ReplaceOrderIntent',
  'placeOrder',
  'place_order',
  'a_place_order',
  'placeComplexOrder',
  'place_complex_order',
  'a_place_complex_order',
  'replaceOrder',
  'replace_order',
  'a_replace_order',
  'deleteOrder',
  'delete_order',
  'a_delete_order',
  'deleteComplexOrder',
  'delete_complex_order',
  'a_delete_complex_order',
  'getOrderBuyingPowerEffect',
  'get_order_buying_power_effect',
  'a_get_order_buying_power_effect',
  'PaperSession',
  'PaperAlertStreamer',
  'PaperSessionOptions',
  'createAccount',
  'deleteAccount',
  'deposit',
  'temporaryAccount',
  'PrivateWatchlist',
  'createPrivateWatchlist',
  'create_private_watchlist',
  'a_create_private_watchlist',
  'updatePrivateWatchlist',
  'update_private_watchlist',
  'a_update_private_watchlist',
  'deletePrivateWatchlist',
  'delete_private_watchlist',
  'a_delete_private_watchlist',
  '_get',
  '_a_get',
  '_paginate',
  '_post',
  '_a_post',
  '_put',
  '_a_put',
  '_delete',
  '_a_delete',
  'headers',
  'session_token',
  'streamer_token',
  'exportSensitiveSessionSnapshot',
  'getCustomer',
  'get_customer',
  'a_get_customer'
] as const

const forbiddenReadOnlySessionMembers = [
  'session',
  'fetch',
  'headers',
  'session_token',
  'sessionToken',
  'streamer_token',
  'streamerToken',
  '_get',
  '_a_get',
  '_paginate',
  '_post',
  '_a_post',
  '_put',
  '_a_put',
  '_delete',
  '_a_delete',
  'requestData',
  'requestJson',
  'url',
  'exportSensitiveSessionSnapshot',
  'getCustomer',
  'get_customer',
  'a_get_customer',
  'placeOrder',
  'place_order',
  'a_place_order',
  'placeComplexOrder',
  'place_complex_order',
  'a_place_complex_order',
  'replaceOrder',
  'replace_order',
  'a_replace_order',
  'deleteOrder',
  'delete_order',
  'a_delete_order',
  'deleteComplexOrder',
  'delete_complex_order',
  'a_delete_complex_order',
  'getOrderBuyingPowerEffect',
  'get_order_buying_power_effect',
  'a_get_order_buying_power_effect',
  'createAccount',
  'deleteAccount',
  'deposit',
  'temporaryAccount',
  'createPrivateWatchlist',
  'updatePrivateWatchlist',
  'deletePrivateWatchlist',
  'remove',
  'a_remove',
  'upload',
  'a_upload',
  'update',
  'a_update',
  'addSymbol',
  'add_symbol',
  'removeSymbol',
  'remove_symbol'
] as const

function assertForbiddenExports(module: Record<string, unknown>, label: string): void {
  for (const name of forbiddenReadOnlyExports) {
    assert.equal(name in module, false, `${name} should not be exported from ${label}`)
  }
}

function assertForbiddenSessionMembers(session: ReadOnly.ReadOnlySession): void {
  for (const name of forbiddenReadOnlySessionMembers) {
    assert.equal(name in session, false, `${name} should not be exposed on ReadOnlySession`)
    assert.equal(
      typeof (session as unknown as Record<string, unknown>)[name],
      'undefined',
      `${name} should not be readable on ReadOnlySession`
    )
  }
}

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

test('package export map resolves read_only entrypoint alias after build', async () => {
  const exported = await importPackage('tastytrade-ts-sdk/read_only')

  assert.equal(exported.ReadOnlySession, ReadOnly.ReadOnlySession)
  assert.equal(exported.DXLinkStreamer, ReadOnly.DXLinkStreamer)
  assert.equal(typeof exported.getMarketDataByType, 'function')
  assert.equal(typeof exported.Quote, 'function')
})

test('root entrypoint omits ReadOnlySession so examples import it from read-only entrypoint', async () => {
  const rootExported = await importPackage('tastytrade-ts-sdk')
  const readOnlyExported = await importPackage('tastytrade-ts-sdk/read-only')

  assert.equal('ReadOnlySession' in Root, false)
  assert.equal('ReadOnlySessionLike' in Root, false)
  assert.equal('ReadOnlySession' in rootExported, false)
  assert.equal('ReadOnlySessionLike' in rootExported, false)
  assert.equal(readOnlyExported.ReadOnlySession, ReadOnly.ReadOnlySession)

  // @ts-expect-error ReadOnlySession is intentionally only available from tastytrade-ts-sdk/read-only.
  Root.ReadOnlySession
  // @ts-expect-error The root barrel also omits the unsafe session-level structural type.
  type _RootReadOnlySessionLike = Root.ReadOnlySessionLike
})

test('read-only entrypoints do not export trading, mutation, paper, watchlist, raw, or token APIs', async () => {
  const exported = await importPackage('tastytrade-ts-sdk/read-only')
  const aliasExported = await importPackage('tastytrade-ts-sdk/read_only')

  assertForbiddenExports(ReadOnly, 'source read-only entrypoint')
  assertForbiddenExports(exported, 'tastytrade-ts-sdk/read-only')
  assertForbiddenExports(aliasExported, 'tastytrade-ts-sdk/read_only')
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
  assertForbiddenSessionMembers(session)
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
  // @ts-expect-error read-only facade intentionally omits low-level async read internals.
  session._a_get
  // @ts-expect-error read-only facade intentionally omits raw pagination internals.
  session._paginate
  // @ts-expect-error read-only facade intentionally omits raw write internals.
  session._post
  // @ts-expect-error read-only facade intentionally omits raw write internals.
  session._a_post
  // @ts-expect-error read-only facade intentionally omits raw write internals.
  session._put
  // @ts-expect-error read-only facade intentionally omits raw write internals.
  session._a_put
  // @ts-expect-error read-only facade intentionally omits raw write internals.
  session._delete
  // @ts-expect-error read-only facade intentionally omits raw write internals.
  session._a_delete
  // @ts-expect-error read-only facade intentionally omits mutable headers.
  session.headers
  // @ts-expect-error read-only facade intentionally omits session bearer tokens.
  session.session_token
  // @ts-expect-error read-only facade intentionally omits streamer bearer tokens.
  session.streamer_token
  // @ts-expect-error read-only facade intentionally omits token-bearing snapshots.
  session.exportSensitiveSessionSnapshot
  // @ts-expect-error read-only facade intentionally omits authenticated customer helper.
  session.getCustomer
  // @ts-expect-error read-only facade intentionally omits live order submission.
  session.placeOrder
  // @ts-expect-error read-only facade intentionally omits live order replacement.
  session.replaceOrder
  // @ts-expect-error read-only facade intentionally omits live order deletion.
  session.deleteOrder
  // @ts-expect-error read-only facade intentionally omits dry-run buying power previews.
  session.getOrderBuyingPowerEffect
  // @ts-expect-error read-only facade intentionally omits paper account mutations.
  session.createAccount
  // @ts-expect-error read-only facade intentionally omits private watchlist mutations.
  session.createPrivateWatchlist
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
