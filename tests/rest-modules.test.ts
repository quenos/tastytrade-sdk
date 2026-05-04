import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ExchangeType as MarketDataExchangeTypeAlias,
  MarketData,
  getMarketData,
  getMarketDataByType,
  get_market_data_by_type
} from '../src/market-data.js'
import {
  ExchangeType,
  MarketCalendar,
  MarketSession,
  getFuturesHolidays,
  getMarketHolidays,
  getMarketSessions
} from '../src/market-sessions.js'
import {
  DividendInfo,
  EarningsInfo,
  MarketMetricInfo,
  getDividends,
  getEarnings,
  getMarketMetrics,
  getRiskFreeRate
} from '../src/metrics.js'
import { InstrumentType } from '../src/order.js'
import { SymbolData, symbolSearch, symbol_search } from '../src/search.js'
import { Session } from '../src/session.js'
import { type JsonMap } from '../src/utils.js'
import {
  PairsWatchlist,
  PrivateWatchlist,
  PublicWatchlist,
  getPairsWatchlist,
  getPairsWatchlists,
  getPublicWatchlists
} from '../src/watchlists.js'

type Call = {
  method: '_get' | '_post' | '_put' | '_delete'
  url: string
  init: (RequestInit & { params?: JsonMap }) | undefined
}

function mockSession(responses: JsonMap[] = []): { session: Session; calls: Call[] } {
  const calls: Call[] = []
  const next = (): JsonMap => responses.shift() ?? {}
  const session = {
    _get: async (url: string, init?: RequestInit & { params?: JsonMap }) => {
      calls.push({ method: '_get', url, init })
      return next()
    },
    _post: async (url: string, init?: RequestInit) => {
      calls.push({ method: '_post', url, init })
      return next()
    },
    _put: async (url: string, init?: RequestInit) => {
      calls.push({ method: '_put', url, init })
      return next()
    },
    _delete: async (url: string, init?: RequestInit) => {
      calls.push({ method: '_delete', url, init })
    }
  } as unknown as Session
  return { session, calls }
}

test('market data by type sends tastyware params and omits empty groups', async () => {
  const { session, calls } = mockSession([{ items: [{ 'instrument-type': 'Equity', symbol: 'SPY' }] }])

  const items = await getMarketDataByType(session, {
    equities: ['SPY'],
    futures: [],
    future_options: ['./ESZ4 EW4U4 240920C5500']
  })

  assert.equal(calls[0]!.url, '/market-data/by-type')
  assert.deepEqual(calls[0]!.init!.params, {
    equity: ['SPY'],
    'future-option': ['./ESZ4 EW4U4 240920C5500']
  })
  assert.ok(items[0] instanceof MarketData)
  assert.equal(items[0]?.instrument_type, InstrumentType.EQUITY)
  assert.equal(items[0]?.symbol, 'SPY')
})

test('market data helpers return typed models with nested instrument data', async () => {
  const { session, calls } = mockSession([
    {
      symbol: 'SPY',
      'instrument-type': 'Equity',
      mark: '512.35',
      'bid-size': '100',
      instrument: {
        symbol: 'SPY',
        'instrument-type': 'Equity',
        'instrument-key': { symbol: 'SPY', 'instrument-type': 'Equity' },
        exchange: 'Equity'
      }
    },
    { items: [{ symbol: 'BTC/USD', 'instrument-type': 'Cryptocurrency', mark: '62000.1' }] }
  ])

  const data = await getMarketData(session, 'SPY', InstrumentType.EQUITY)
  const byType = await get_market_data_by_type(session, { cryptocurrencies: ['BTC/USD'] })

  assert.equal(calls[0]!.url, '/market-data/Equity/SPY')
  assert.equal(calls[1]!.url, '/market-data/by-type')
  assert.ok(data instanceof MarketData)
  assert.equal(data.mark?.toString(), '512.35')
  assert.equal(data.instrument?.instrument_key?.symbol, 'SPY')
  assert.equal(byType[0]?.mark?.toString(), '62000.1')
})

test('market data submodule exposes Python ExchangeType alias', () => {
  assert.equal(MarketDataExchangeTypeAlias.CBOE, 'CBOED')
  assert.equal(MarketDataExchangeTypeAlias.NYSE, 'Equity')
})

test('market sessions sends instrument-collections array using exchange values', async () => {
  const { session, calls } = mockSession([{ items: [{ state: 'Open', 'instrument-collection': 'CME' }] }])

  await getMarketSessions(session, [ExchangeType.CME, ExchangeType.NYSE])

  assert.equal(calls[0]!.url, '/market-time/sessions/current')
  assert.deepEqual(calls[0]!.init!.params, { 'instrument-collections[]': ['CME', 'Equity'] })
})

test('market sessions and calendars parse Python aliases into typed models', async () => {
  const { session, calls } = mockSession([
    {
      items: [
        {
          state: 'Open',
          'instrument-collection': 'CME',
          'next-session': {
            'session-date': '2024-03-15',
            'open-at': '2024-03-15T13:30:00Z',
            'start-at': '2024-03-15T13:30:00Z',
            'close-at': '2024-03-15T20:00:00Z'
          }
        }
      ]
    },
    { 'market-half-days': ['2024-11-29'], 'market-holidays': ['2024-12-25'] },
    { 'market-half-days': ['2024-07-03'], 'market-holidays': ['2024-07-04'] }
  ])

  const sessions = await getMarketSessions(session, [ExchangeType.CME])
  const equityCalendar = await getMarketHolidays(session)
  const futuresCalendar = await getFuturesHolidays(session, ExchangeType.CME)

  assert.ok(sessions[0] instanceof MarketSession)
  assert.equal(sessions[0]?.status, 'Open')
  assert.equal(sessions[0]?.next_session?.session_date, '2024-03-15')
  assert.ok(equityCalendar instanceof MarketCalendar)
  assert.deepEqual(equityCalendar.half_days, ['2024-11-29'])
  assert.deepEqual(futuresCalendar.holidays, ['2024-07-04'])
  assert.equal(calls[2]!.url, '/market-time/futures/holidays/CME')
})

test('metrics encode slash symbols and risk-free-rate strips Authorization', async () => {
  const { session, calls } = mockSession([
    { items: [{ 'occurred-date': '2024-02-01', amount: '0.24' }] },
    { items: [{ 'occurred-date': '2024-02-02', eps: '1.23' }] }
  ])
  const dividends = await getDividends(session, 'BRK/B')
  const earnings = await getEarnings(session, 'BRK/B', '2024-01-01')

  assert.equal(calls[0]!.url, '/market-metrics/historic-corporate-events/dividends/BRK%2FB')
  assert.equal(calls[1]!.url, '/market-metrics/historic-corporate-events/earnings-reports/BRK%2FB')
  assert.deepEqual(calls[1]!.init!.params, { 'start-date': '2024-01-01' })
  assert.ok(dividends[0] instanceof DividendInfo)
  assert.equal(dividends[0]?.amount?.toString(), '0.24')
  assert.ok(earnings[0] instanceof EarningsInfo)
  assert.equal(earnings[0]?.eps?.toString(), '1.23')

  const fetchCalls: Array<{ url: string; init: RequestInit | undefined }> = []
  const fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    fetchCalls.push({ url: String(url), init })
    return new Response(JSON.stringify({ data: { 'risk-free-rate': '0.0525' } }), { status: 200 })
  }
  const realSession = new Session({ providerSecret: 'secret', refreshToken: 'refresh', fetch })
  realSession.headers.Authorization = 'Bearer leaked'

  const rate = await getRiskFreeRate(realSession)

  assert.equal(rate.toString(), '0.0525')
  assert.equal(fetchCalls.length, 1)
  assert.equal(fetchCalls[0]!.url, 'https://api.tastyworks.com/margin-requirements-public-configuration')
  assert.equal((fetchCalls[0]!.init!.headers as Record<string, string>).Authorization, undefined)
})

test('market metrics parses nested report and liquidity models', async () => {
  const { session, calls } = mockSession([
    {
      items: [
        {
          symbol: 'SPY',
          'updated-at': '2024-03-01T12:00:00Z',
          'market-cap': '1000000',
          beta: '1.1',
          earnings: {
            estimated: false,
            visible: true,
            'late-flag': 0,
            'actual-eps': '2.5'
          },
          'liquidity-running-state': {
            sum: '10.5',
            count: 3,
            'started-at': '2024-03-01T12:00:00Z'
          },
          'option-expiration-implied-volatilities': [
            {
              'expiration-date': '2024-03-15',
              'settlement-type': 'PM',
              'option-chain-type': 'Standard',
              'implied-volatility': '0.18'
            }
          ]
        }
      ]
    }
  ])

  const metrics = await getMarketMetrics(session, ['SPY', 'QQQ'])

  assert.equal(calls[0]!.url, '/market-metrics')
  assert.deepEqual(calls[0]!.init!.params, { symbols: 'SPY,QQQ' })
  assert.ok(metrics[0] instanceof MarketMetricInfo)
  assert.equal(metrics[0]?.market_cap?.toString(), '1000000')
  assert.equal(metrics[0]?.earnings?.actual_eps?.toString(), '2.5')
  assert.equal(metrics[0]?.liquidity_running_state?.sum?.toString(), '10.5')
  assert.equal(metrics[0]?.option_expiration_implied_volatilities?.[0]?.implied_volatility?.toString(), '0.18')
})

test('symbol search uses encoded direct fetch and returns empty results on non-2xx', async () => {
  const fetchCalls: string[] = []
  const fetch = async (url: string | URL | Request): Promise<Response> => {
    fetchCalls.push(String(url))
    return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 })
  }
  const session = new Session({ providerSecret: 'secret', refreshToken: 'refresh', fetch })
  session.session_expiration = Date.now() / 1000 + 900
  session.headers.Authorization = 'Bearer token'

  const results = await symbolSearch(session, 'BRK/B')

  assert.deepEqual(results, [])
  assert.deepEqual(fetchCalls, ['https://api.tastyworks.com/symbols/search/BRK%2FB'])
})

test('symbol search returns typed symbol data and exposes Python alias', async () => {
  const fetchCalls: string[] = []
  const fetch = async (url: string | URL | Request): Promise<Response> => {
    fetchCalls.push(String(url))
    return new Response(JSON.stringify({ data: { items: [{ symbol: 'BRK/B', description: 'Berkshire' }] } }), { status: 200 })
  }
  const session = new Session({ providerSecret: 'secret', refreshToken: 'refresh', fetch })
  session.session_expiration = Date.now() / 1000 + 900
  session.headers.Authorization = 'Bearer token'

  const results = await symbol_search(session, 'BRK/B')

  assert.ok(results[0] instanceof SymbolData)
  assert.equal(results[0]?.symbol, 'BRK/B')
  assert.deepEqual(fetchCalls, ['https://api.tastyworks.com/symbols/search/BRK%2FB'])
})

test('watchlist helpers match tastyware routes, params, and request bodies', async () => {
  const { session, calls } = mockSession([
    { items: [{ name: 'Pairs', 'order-index': 1, 'pairs-equations': [] }] },
    { name: 'Pairs', 'order-index': 1, 'pairs-equations': [] },
    { name: 'Pairs', 'order-index': 1, 'pairs-equations': [] },
    { items: [{ name: 'Public', 'watchlist-entries': [] }] },
    { name: 'Private', 'watchlist-entries': [] },
    {},
    {}
  ])

  const pairs = await getPairsWatchlists(session)
  const pair = await getPairsWatchlist(session, 'Pairs')
  const pairClass = await PairsWatchlist.get(session, 'Pairs')
  const publicLists = await PublicWatchlist.get(session, { counts_only: true })
  const privateList = await PrivateWatchlist.get(session, 'Private')
  privateList.addSymbol('SPY', InstrumentType.EQUITY)
  privateList.remove_symbol('SPY', InstrumentType.EQUITY)
  privateList.add_symbol('QQQ', InstrumentType.EQUITY)
  await privateList.upload(session)
  await privateList.update(session)

  assert.equal(pairs[0]!.name, 'Pairs')
  assert.equal(pair.name, 'Pairs')
  assert.equal(pairClass.name, 'Pairs')
  assert.equal(publicLists[0]!.name, 'Public')
  assert.deepEqual(calls.map((call) => [call.method, call.url]), [
    ['_get', '/pairs-watchlists'],
    ['_get', '/pairs-watchlists/Pairs'],
    ['_get', '/pairs-watchlists/Pairs'],
    ['_get', '/public-watchlists'],
    ['_get', '/watchlists/Private'],
    ['_post', '/watchlists'],
    ['_put', '/watchlists/Private']
  ])
  assert.deepEqual(calls[3]!.init!.params, { 'counts-only': true })
  assert.deepEqual(JSON.parse(String(calls[5]!.init!.body)), {
    name: 'Private',
    'watchlist-entries': [{ symbol: 'QQQ', 'instrument-type': 'Equity' }],
    'group-name': 'default',
    'order-index': 9999
  })
  assert.deepEqual(JSON.parse(String(calls[6]!.init!.body)), JSON.parse(String(calls[5]!.init!.body)))
})

test('public watchlist function exposes counts-only parity parameter', async () => {
  const { session, calls } = mockSession([{ items: [] }])

  await getPublicWatchlists(session, true)

  assert.equal(calls[0]!.url, '/public-watchlists')
  assert.deepEqual(calls[0]!.init!.params, { 'counts-only': true })
})
