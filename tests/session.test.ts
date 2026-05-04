import assert from 'node:assert/strict'
import test from 'node:test'

import { Address, Customer, CustomerAccountType, CustomerSuitability, Session } from '../src/index.js'

test('Session refresh posts OAuth payload without Authorization header', async () => {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(url), init })
    return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
  }
  const session = new Session({ providerSecret: 'secret', refreshToken: 'refresh', fetch })

  await session.refresh(true)

  assert.equal(calls[0]!.url, 'https://api.tastyworks.com/oauth/token')
  assert.equal((calls[0]!.init!.headers as Record<string, string>).Authorization, undefined)
  assert.equal((calls[0]!.init!.headers as Record<string, string>)['User-Agent'], 'tastyware/tastytrade:v11.1.0')
  assert.deepEqual(JSON.parse(String(calls[0]!.init!.body)), {
    grant_type: 'refresh_token',
    client_secret: 'secret',
    refresh_token: 'refresh'
  })
  assert.equal(session.headers.Authorization, 'Bearer token-1')
})

test('Session omits Accept-Version for certification sessions', () => {
  const session = new Session({ providerSecret: 'secret', refreshToken: 'refresh', isTest: true, fetch: async () => new Response() })

  assert.equal(session.base_url, 'https://api.cert.tastyworks.com')
  assert.equal(session.headers['Accept-Version'], undefined)
})

test('Session accepts Python-style env aliases but does not use TT_CLIENT_ID as the OAuth secret', () => {
  const oldSecret = process.env.TT_SECRET
  const oldClientSecret = process.env.TT_CLIENT_SECRET
  const oldApiClientSecret = process.env.TT_API_CLIENT_SECRET
  const oldClientId = process.env.TT_CLIENT_ID
  const oldRefresh = process.env.TT_REFRESH
  const oldRefreshToken = process.env.TT_REFRESH_TOKEN
  const oldIsTest = process.env.TT_IS_TEST
  try {
    delete process.env.TT_SECRET
    delete process.env.TT_CLIENT_SECRET
    delete process.env.TT_REFRESH
    process.env.TT_API_CLIENT_SECRET = 'api-client-secret'
    process.env.TT_CLIENT_ID = 'client-id'
    process.env.TT_REFRESH_TOKEN = 'refresh-token'
    process.env.TT_IS_TEST = 'true'

    const session = new Session({ fetch: async () => new Response() })

    assert.equal(session.provider_secret, 'api-client-secret')
    assert.equal(session.refresh_token, 'refresh-token')
    assert.equal(session.is_test, true)
  } finally {
    restoreEnv('TT_SECRET', oldSecret)
    restoreEnv('TT_CLIENT_SECRET', oldClientSecret)
    restoreEnv('TT_API_CLIENT_SECRET', oldApiClientSecret)
    restoreEnv('TT_CLIENT_ID', oldClientId)
    restoreEnv('TT_REFRESH', oldRefresh)
    restoreEnv('TT_REFRESH_TOKEN', oldRefreshToken)
    restoreEnv('TT_IS_TEST', oldIsTest)
  }
})

test('Session paginates all pages only when page-offset is null', async () => {
  const requested: string[] = []
  const fetch = async (url: string | URL | Request): Promise<Response> => {
    requested.push(String(url))
    if (String(url).endsWith('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
    }
    const page = new URL(String(url)).searchParams.get('page-offset')
    return new Response(
      JSON.stringify({
        data: { items: [{ page }] },
        pagination: { 'page-offset': Number(page), 'total-pages': 2 }
      }),
      { status: 200 }
    )
  }
  const session = new Session({ providerSecret: 'secret', refreshToken: 'refresh', fetch })

  const all = await session._paginate((item) => item, '/things', { 'page-offset': null, 'per-page': 1 })

  assert.deepEqual(
    all.map((item) => item.page),
    ['0', '1']
  )
  assert.equal(requested.filter((url) => url.includes('/things')).length, 2)
})

test('Session does not continue pagination from data.pagination', async () => {
  const requested: string[] = []
  const fetch = async (url: string | URL | Request): Promise<Response> => {
    requested.push(String(url))
    if (String(url).endsWith('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
    }
    return new Response(
      JSON.stringify({
        data: { items: [{ page: '0' }], pagination: { 'page-offset': 0, 'total-pages': 2 } }
      }),
      { status: 200 }
    )
  }
  const session = new Session({ providerSecret: 'secret', refreshToken: 'refresh', fetch })

  const all = await session._paginate((item) => item, '/things', { 'page-offset': null, 'per-page': 1 })

  assert.deepEqual(all, [{ page: '0' }])
  assert.equal(requested.filter((url) => url.includes('/things')).length, 1)
})

test('Session exposes Python snake_case aliases and streamer token refresh state', async () => {
  const requested: string[] = []
  const fetch = async (url: string | URL | Request): Promise<Response> => {
    requested.push(String(url))
    if (String(url).endsWith('/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'token-1', expires_in: 900 }), { status: 200 })
    }
    if (String(url).endsWith('/api-quote-tokens')) {
      return new Response(
        JSON.stringify({
          data: {
            token: 'dx-token',
            'dxlink-url': 'wss://dx.example',
            'expires-at': '2026-05-04T12:00:00Z'
          }
        }),
        { status: 200 }
      )
    }
    return new Response(
      JSON.stringify({
        data: {
          id: 'customer-1',
          'first-name': 'Ada',
          address: { city: 'Chicago', country: 'USA', 'is-domestic': true },
          'mailing-address': { city: 'Chicago', country: 'USA', 'is-domestic': true },
          'customer-suitability': { id: 1, 'annual-net-income': 100000 },
          person: { 'first-name': 'Ada', 'last-name': 'Lovelace' },
          'permitted-account-types': [{ name: 'Individual', 'margin-types': [{ name: 'Margin', 'is-margin': true }] }]
        }
      }),
      { status: 200 }
    )
  }
  const session = new Session({ providerSecret: 'secret', refreshToken: 'refresh', proxy: 'http://proxy.example', fetch })

  await session.refresh_streamer_token()
  const customer = await session.get_customer()
  const serialized = Session.deserialize(session.exportSensitiveSessionSnapshot(), { fetch })

  assert.equal(session.proxy, 'http://proxy.example')
  assert.equal(session.streamer_token, 'dx-token')
  assert.equal(session.dxlink_url, 'wss://dx.example')
  assert.ok(customer instanceof Customer)
  assert.equal(customer.id, 'customer-1')
  assert.ok(customer.address instanceof Address)
  assert.ok(customer.customer_suitability instanceof CustomerSuitability)
  assert.ok(customer.permitted_account_types?.[0] instanceof CustomerAccountType)
  assert.equal(customer.permitted_account_types?.[0]?.margin_types?.[0]?.is_margin, true)
  assert.equal(serialized.streamer_token, 'dx-token')
  assert.equal(serialized.dxlink_url, 'wss://dx.example')
  assert.ok(requested.some((url) => url.endsWith('/api-quote-tokens')))
})

test('Session serialize excludes credential and bearer-token fields by default', () => {
  const session = new Session({
    providerSecret: 'provider-secret',
    refreshToken: 'refresh-token',
    fetch: async () => new Response(),
    headers: {
      Authorization: 'Bearer header-token',
      'X-Api-Key': 'api-key-token',
      'X-Trace-Id': 'trace-1'
    }
  })
  session.session_token = 'session-token'
  session.streamer_token = 'streamer-token'
  session.dxlink_url = 'wss://dx.example'

  const serialized = session.serialize()
  const snapshot = JSON.parse(serialized) as Record<string, unknown>
  const headers = snapshot.headers as Record<string, string>

  assert.equal(snapshot.provider_secret, undefined)
  assert.equal(snapshot.refresh_token, undefined)
  assert.equal(snapshot.session_token, undefined)
  assert.equal(snapshot.streamer_token, undefined)
  assert.equal(headers.Authorization, undefined)
  assert.equal(headers['X-Api-Key'], undefined)
  assert.equal(headers['X-Trace-Id'], 'trace-1')
  assert.equal(serialized.includes('provider-secret'), false)
  assert.equal(serialized.includes('refresh-token'), false)
  assert.equal(serialized.includes('session-token'), false)
  assert.equal(serialized.includes('streamer-token'), false)
  assert.equal(serialized.includes('header-token'), false)

  const restored = Session.deserialize(serialized, { fetch: async () => new Response() })
  assert.equal(restored.provider_secret, '')
  assert.equal(restored.refresh_token, '')
  assert.equal(restored.session_token, 'kyrieeleison')
  assert.equal(restored.streamer_token, '')
})

test('Session serialize recursively excludes nested credentials and bearer-token headers', () => {
  const session = new Session({
    providerSecret: 'provider-secret',
    refreshToken: 'refresh-token',
    fetch: async () => new Response(),
    headers: {
      'X-Trace-Id': 'trace-1'
    }
  })
  Object.assign(session.headers as Record<string, unknown>, {
    nested: {
      Authorization: 'Bearer nested-auth',
      cookie: 'session=nested-cookie',
      api_key: 'nested-api-key',
      apikey: 'nested-apikey',
      safe: 'safe-value',
      deeper: [{ 'X-Api-Key': 'nested-x-api-key', value: 'kept' }]
    },
    array: [
      { authorization: 'Bearer array-auth', value: 'array-safe' },
      { 'set-cookie': 'array-cookie', keep: 'array-keep' }
    ]
  })

  const serialized = session.serialize()
  const snapshot = JSON.parse(serialized) as Record<string, unknown>
  const headers = snapshot.headers as Record<string, unknown>
  const nested = headers.nested as Record<string, unknown>
  const deeper = nested.deeper as Array<Record<string, unknown>>
  const array = headers.array as Array<Record<string, unknown>>

  assert.equal(nested.Authorization, undefined)
  assert.equal(nested.cookie, undefined)
  assert.equal(nested.api_key, undefined)
  assert.equal(nested.apikey, undefined)
  assert.equal(nested.safe, 'safe-value')
  assert.equal(deeper[0]?.['X-Api-Key'], undefined)
  assert.equal(deeper[0]?.value, 'kept')
  assert.equal(array[0]?.authorization, undefined)
  assert.equal(array[0]?.value, 'array-safe')
  assert.equal(array[1]?.['set-cookie'], undefined)
  assert.equal(array[1]?.keep, 'array-keep')
  assert.equal(serialized.includes('nested-auth'), false)
  assert.equal(serialized.includes('nested-cookie'), false)
  assert.equal(serialized.includes('nested-api-key'), false)
  assert.equal(serialized.includes('nested-apikey'), false)
  assert.equal(serialized.includes('nested-x-api-key'), false)
  assert.equal(serialized.includes('array-auth'), false)
  assert.equal(serialized.includes('array-cookie'), false)
})

test('Session explicit sensitive export retains credentials and tokens', () => {
  const session = new Session({
    providerSecret: 'provider-secret',
    refreshToken: 'refresh-token',
    fetch: async () => new Response()
  })
  session.session_token = 'session-token'
  session.streamer_token = 'streamer-token'
  session.headers.Authorization = 'Bearer header-token'

  const snapshot = JSON.parse(session.exportSensitiveSessionSnapshot()) as Record<string, unknown>
  const headers = snapshot.headers as Record<string, string>

  assert.equal(snapshot.provider_secret, 'provider-secret')
  assert.equal(snapshot.refresh_token, 'refresh-token')
  assert.equal(snapshot.session_token, 'session-token')
  assert.equal(snapshot.streamer_token, 'streamer-token')
  assert.equal(headers.Authorization, 'Bearer header-token')
})

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}
