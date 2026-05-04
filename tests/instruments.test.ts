import assert from 'node:assert/strict'
import test from 'node:test'

import {
  Cryptocurrency,
  Equity,
  Future,
  FutureMonthCode,
  FutureOption,
  FutureOptionProduct,
  FutureProduct,
  NestedFutureOptionChain,
  NestedOptionChain,
  Option,
  OptionType,
  Warrant,
  a_get_option_chain,
  a_get_quantity_decimal_precisions,
  getFutureOptionChain,
  getOptionChain,
  getQuantityDecimalPrecisions
} from '../src/instruments.js'
import { InstrumentType } from '../src/order.js'
import { Session } from '../src/session.js'
import { type JsonMap } from '../src/utils.js'

test('Option converts streamer symbol to OCC symbol', () => {
  assert.equal(Option.streamer_symbol_to_occ('.SPY240324P480.5'), 'SPY   240324P00480500')
})

test('FutureMonthCode exposes Python enum member names without dropping camel-friendly names', () => {
  assert.equal(FutureMonthCode.JAN, 'F')
  assert.equal(FutureMonthCode.JANUARY, 'F')
  assert.equal(FutureMonthCode.MAY, 'K')
})

test('instrument models expose Python async fetch aliases', () => {
  assert.equal(Cryptocurrency.a_get, Cryptocurrency.get)
  assert.equal(Equity.a_get, Equity.get)
  assert.equal(Equity.a_get_active_equities, Equity.getActiveEquities)
  assert.equal(Option.a_get, Option.get)
  assert.equal(Future.a_get, Future.get)
  assert.equal(FutureOption.a_get, FutureOption.get)
  assert.equal(Warrant.a_get, Warrant.get)
})

test('Option converts OCC symbol to streamer symbol', () => {
  assert.equal(Option.occ_to_streamer_symbol('SPY   240324P00480500'), '.SPY240324P480.5')
})

test('Option derives streamer symbol when API payload omits it', () => {
  const option = new Option({
    symbol: 'SPY   240324P00480500',
    underlying_symbol: 'SPY',
    expiration_date: '2024-03-24',
    option_type: OptionType.PUT,
    strike_price: '480.50'
  })

  assert.equal(option.streamer_symbol, '.SPY240324P480.5')
})

test('single instrument fetchers match tastyware path symbol conversions', async () => {
  const { session, calls } = mockSession((url) => {
    switch (url.pathname) {
      case '/instruments/cryptocurrencies/BTC%2FUSD':
        return {
          symbol: 'BTC/USD',
          'instrument-type': 'Cryptocurrency',
          'tick-size': '0.01',
          'destination-venue-symbols': [
            {
              id: 1,
              symbol: 'BTC/USD',
              'destination-venue': 'Zero Hash',
              routable: true,
              'max-quantity-precision': 8
            }
          ]
        }
      case '/instruments/equities/BRK%2FB':
        return { symbol: 'BRK/B', 'instrument-type': 'Equity', description: 'Berkshire Hathaway' }
      case '/instruments/equity-options/SPY%20%20%20240324P00480500':
        return { symbol: 'SPY   240324P00480500', 'strike-price': '480.5', 'expiration-date': '2024-03-24' }
      case '/instruments/future-products/CME/ES':
        return { code: 'ES', 'root-symbol': '/ES', 'tick-size': '0.25', roll: { name: 'front', 'active-count': 2 } }
      case '/instruments/futures/ESZ9':
        return { symbol: 'ESZ9', 'instrument-type': 'Future', 'tick-size': '0.25', 'future-etf-equivalent': { symbol: 'SPY', 'share-quantity': 500 } }
      case '/instruments/future-option-products/CME/EW3':
        return { 'root-symbol': 'EW3', code: 'EW3', 'display-factor': '1', 'clearing-price-multiplier': '50' }
      case '/instruments/future-options/%2FESZ9%20EW3%20C3500':
        return { symbol: '/ESZ9 EW3 C3500', 'instrument-type': 'Future Option', 'strike-price': '3500', 'expiration-date': '2024-03-15' }
      case '/instruments/warrants/NKLAW':
        return { symbol: 'NKLAW', 'instrument-type': 'Warrant', description: 'Nikola Warrant' }
      default:
        throw new Error(`unexpected path ${url.pathname}`)
    }
  })

  const crypto = await Cryptocurrency.get(session, 'BTC/USD')
  const equity = await Equity.get(session, 'BRK/B')
  const option = await Option.get(session, 'SPY   240324P00480500')
  const futureProduct = await FutureProduct.get(session, '/ES')
  const future = await Future.get(session, '/ESZ9')
  const futureOptionProduct = await FutureOptionProduct.get(session, '/EW3')
  const futureOption = await FutureOption.get(session, '/ESZ9 EW3 C3500')
  const warrant = await Warrant.get(session, 'NKLAW')

  assert.deepEqual(
    calls.map((call) => call.url.pathname),
    [
      '/instruments/cryptocurrencies/BTC%2FUSD',
      '/instruments/equities/BRK%2FB',
      '/instruments/equity-options/SPY%20%20%20240324P00480500',
      '/instruments/future-products/CME/ES',
      '/instruments/futures/ESZ9',
      '/instruments/future-option-products/CME/EW3',
      '/instruments/future-options/%2FESZ9%20EW3%20C3500',
      '/instruments/warrants/NKLAW'
    ]
  )
  assert.equal(crypto.tick_size?.toString(), '0.01')
  assert.equal(crypto.destination_venue_symbols?.[0]?.destination_venue, 'Zero Hash')
  assert.equal(equity.symbol, 'BRK/B')
  assert.equal(option.strike_price?.toString(), '480.5')
  assert.equal(futureProduct.tick_size?.toString(), '0.25')
  assert.equal(future.future_etf_equivalent?.share_quantity, 500)
  assert.equal(futureOptionProduct.clearing_price_multiplier?.toString(), '50')
  assert.equal(futureOption.strike_price?.toString(), '3500')
  assert.equal(warrant.instrument_type, InstrumentType.WARRANT)
})

test('list fetchers send tastyware-compatible query parameters', async () => {
  const { session, calls } = mockSession((url) => {
    switch (url.pathname) {
      case '/instruments/cryptocurrencies':
        return { items: [{ symbol: 'BTC/USD' }] }
      case '/instruments/equities':
        return { items: [{ symbol: 'SPY' }] }
      case '/instruments/equities/active':
        return { items: [{ symbol: 'SPY' }] }
      case '/instruments/equity-options':
        return { items: [{ symbol: 'SPY   240324P00480500' }] }
      case '/instruments/futures':
        return { items: [{ symbol: 'ESZ9' }] }
      case '/instruments/future-options':
        return { items: [{ symbol: '/ESZ9 EW3 C3500' }] }
      case '/instruments/warrants':
        return { items: [{ symbol: 'NKLAW' }] }
      default:
        throw new Error(`unexpected path ${url.pathname}`)
    }
  })

  await Cryptocurrency.get(session, ['BTC/USD', 'ETH/USD'])
  await Equity.get(session, ['SPY', 'QQQ'], {
    lendability: 'Easy To Borrow',
    is_index: false,
    is_etf: true,
    per_page: 2,
    page_offset: null
  })
  await Equity.get_active_equities(session, { per_page: 3, page_offset: 1, lendability: 'Locate Required' })
  await Option.get(session, ['SPY   240324P00480500'], { active: true, with_expired: false, per_page: 4, page_offset: 2 })
  await Future.get(session, ['/ESZ9'], { product_codes: ['ES'], per_page: 5, page_offset: 0 })
  await FutureOption.get(session, ['/ESZ9 EW3 C3500'], {
    root_symbol: 'EW3',
    expiration_date: '2024-03-15',
    option_type: OptionType.CALL,
    strike_price: '3500.5',
    per_page: 6,
    page_offset: 3
  })
  await Warrant.get(session, ['NKLAW'])

  const crypto = calls[0]!.url.searchParams
  assert.deepEqual(crypto.getAll('symbol[]'), ['BTC/USD', 'ETH/USD'])

  const equities = calls[1]!.url.searchParams
  assert.deepEqual(equities.getAll('symbol[]'), ['SPY', 'QQQ'])
  assert.equal(equities.get('lendability'), 'Easy To Borrow')
  assert.equal(equities.get('is-index'), 'false')
  assert.equal(equities.get('is-etf'), 'true')
  assert.equal(equities.get('page-offset'), '0')

  const active = calls[2]!.url.searchParams
  assert.equal(active.get('per-page'), '3')
  assert.equal(active.get('page-offset'), '1')
  assert.equal(active.get('lendability'), 'Locate Required')

  const options = calls[3]!.url.searchParams
  assert.equal(options.get('active'), 'true')
  assert.equal(options.get('with-expired'), 'false')
  assert.equal(options.get('per-page'), '4')

  const futures = calls[4]!.url.searchParams
  assert.deepEqual(futures.getAll('symbol[]'), ['/ESZ9'])
  assert.deepEqual(futures.getAll('product-code[]'), ['ES'])

  const futureOptions = calls[5]!.url.searchParams
  assert.equal(futureOptions.get('option-root-symbol'), 'EW3')
  assert.equal(futureOptions.get('expiration-date'), '2024-03-15')
  assert.equal(futureOptions.get('option-type'), 'C')
  assert.equal(futureOptions.get('strike-price'), '3500.5')

  const warrants = calls[6]!.url.searchParams
  assert.deepEqual(warrants.getAll('symbol[]'), ['NKLAW'])
})

test('chain helpers group flat chains and parse nested chain models', async () => {
  const { session, calls } = mockSession((url) => {
    switch (url.pathname) {
      case '/option-chains/BRK%2FB':
        return {
          items: [
            optionPayload('SPY   240315C00450000', '2024-03-15', 'C', '450'),
            optionPayload('SPY   240315P00450000', '2024-03-15', 'P', '450')
          ]
        }
      case '/option-chains/BRK%2FB/nested':
        return {
          items: [
            {
              'underlying-symbol': 'BRK/B',
              'root-symbol': 'BRK/B',
              'tick-sizes': [{ value: '0.01', threshold: '3' }],
              expirations: [
                {
                  'expiration-date': '2024-03-15',
                  'expiration-type': 'Regular',
                  strikes: [
                    {
                      'strike-price': '450',
                      call: 'SPY   240315C00450000',
                      put: 'SPY   240315P00450000',
                      'call-streamer-symbol': '.SPY240315C450',
                      'put-streamer-symbol': '.SPY240315P450'
                    }
                  ]
                }
              ],
              deliverables: [{ id: 1, amount: '100', percent: '100', 'root-symbol': 'SPY' }]
            }
          ]
        }
      case '/futures-option-chains/ES':
        return {
          items: [
            {
              symbol: '/ESZ9 EW3 C3500',
              'instrument-type': 'Future Option',
              'expiration-date': '2024-03-15',
              'maturity-date': '2024-03-15 00:00:00+00:00',
              'strike-price': '3500'
            }
          ]
        }
      case '/futures-option-chains/ES/nested':
        return {
          futures: [
            {
              symbol: 'ESZ9',
              'root-symbol': 'ES',
              'expiration-date': '2024-12-20',
              'maturity-date': '2024-12-20 00:00:00+00:00',
              'days-to-expiration': 280
            }
          ],
          'option-chains': [
            {
              'underlying-symbol': 'ESZ9',
              'root-symbol': 'EW3',
              expirations: [
                {
                  'root-symbol': 'EW3',
                  'underlying-symbol': 'ESZ9',
                  'expiration-date': '2024-03-15',
                  'notional-value': '50',
                  'strike-factor': '1',
                  'display-factor': '0.01',
                  strikes: [
                    {
                      'strike-price': '3500',
                      call: '/ESZ9 EW3 C3500',
                      put: '/ESZ9 EW3 P3500'
                    }
                  ],
                  'tick-sizes': [{ value: '0.25' }]
                }
              ]
            }
          ]
        }
      default:
        throw new Error(`unexpected path ${url.pathname}`)
    }
  })

  const optionChain = await getOptionChain(session, 'BRK/B')
  const nestedOptionChain = await NestedOptionChain.get(session, 'BRK/B')
  const futureOptionChain = await getFutureOptionChain(session, '/ES')
  const nestedFutureOptionChain = await NestedFutureOptionChain.get(session, '/ES')

  assert.deepEqual(
    calls.map((call) => call.url.pathname),
    ['/option-chains/BRK%2FB', '/option-chains/BRK%2FB/nested', '/futures-option-chains/ES', '/futures-option-chains/ES/nested']
  )
  assert.equal(optionChain['2024-03-15']?.length, 2)
  assert.equal(optionChain['2024-03-15']?.[0]?.streamer_symbol, '.SPY240315C450')
  assert.equal(nestedOptionChain[0]?.tick_sizes?.[0]?.value?.toString(), '0.01')
  assert.equal(nestedOptionChain[0]?.expirations?.[0]?.strikes?.[0]?.strike_price?.toString(), '450')
  assert.equal(nestedOptionChain[0]?.deliverables?.[0]?.amount?.toString(), '100')
  assert.equal(futureOptionChain['2024-03-15']?.[0]?.strike_price?.toString(), '3500')
  assert.equal(futureOptionChain['2024-03-15']?.[0]?.maturity_date, '2024-03-15')
  assert.equal(nestedFutureOptionChain.futures?.[0]?.symbol, 'ESZ9')
  assert.equal(nestedFutureOptionChain.futures?.[0]?.maturity_date, '2024-12-20')
  assert.equal(nestedFutureOptionChain.option_chains?.[0]?.expirations?.[0]?.notional_value?.toString(), '50')
  assert.equal(nestedFutureOptionChain.option_chains?.[0]?.expirations?.[0]?.tick_sizes?.[0]?.value?.toString(), '0.25')
  assert.equal(a_get_option_chain, getOptionChain)
})

test('quantity decimal precision helper calls static endpoint', async () => {
  const { session, calls } = mockSession(() => ({
    items: [
      {
        'instrument-type': 'Cryptocurrency',
        value: 8,
        'minimum-increment-precision': 2,
        symbol: 'BTC/USD'
      }
    ]
  }))

  const precisions = await getQuantityDecimalPrecisions(session)

  assert.equal(calls[0]!.url.pathname, '/instruments/quantity-decimal-precisions')
  assert.equal(precisions[0]?.instrument_type, InstrumentType.CRYPTOCURRENCY)
  assert.equal(precisions[0]?.minimum_increment_precision, 2)
  assert.equal(a_get_quantity_decimal_precisions, getQuantityDecimalPrecisions)
})

function mockSession(handler: (url: URL, init: RequestInit | undefined) => JsonMap): {
  session: Session
  calls: Array<{ url: URL; init: RequestInit | undefined }>
} {
  const calls: Array<{ url: URL; init: RequestInit | undefined }> = []
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input))
    calls.push({ url, init })
    return new Response(JSON.stringify({ data: handler(url, init) }), { status: 200 })
  }
  const session = new Session({ providerSecret: 'secret', refreshToken: 'refresh', fetch })
  session.session_expiration = Number.MAX_SAFE_INTEGER
  session.headers.Authorization = 'Bearer token'
  return { session, calls }
}

function optionPayload(symbol: string, expirationDate: string, optionType: 'C' | 'P', strikePrice: string): JsonMap {
  return {
    symbol,
    'underlying-symbol': 'SPY',
    'expiration-date': expirationDate,
    'option-type': optionType,
    'strike-price': strikePrice
  }
}
