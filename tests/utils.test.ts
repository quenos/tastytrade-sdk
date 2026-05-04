import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PriceEffect,
  TastytradeError,
  VERSION,
  __version__,
  getFutureFxMonthly,
  getFutureGrainMonthly,
  getFutureIndexMonthly,
  getFutureMetalMonthly,
  getFutureOilMonthly,
  getFutureTreasuryMonthly,
  getSign,
  get_sign,
  get_third_friday,
  getThirdFriday,
  get_tasty_monthly,
  setSignFor,
  set_sign_for,
  validateAndParse,
  validate_and_parse,
  validateResponse,
  validate_response,
  versionStr,
  version_str,
  ymd
} from '../src/index.js'
import {
  TastytradeData,
  get_future_fx_monthly as utils_get_future_fx_monthly,
  paginate
} from '../src/utils.js'

test('calendar helpers match tastyware fixture dates', () => {
  assert.equal(ymd(getThirdFriday(new Date(Date.UTC(2024, 2, 2)))), '2024-03-15')
  assert.equal(ymd(getFutureFxMonthly(new Date(Date.UTC(2024, 1, 9)))), '2024-02-09')
  assert.equal(ymd(getFutureTreasuryMonthly(new Date(Date.UTC(2024, 1, 23)))), '2024-02-23')
  assert.equal(ymd(getFutureGrainMonthly(new Date(Date.UTC(2025, 10, 21)))), '2025-11-21')
  assert.equal(ymd(getFutureMetalMonthly(new Date(Date.UTC(2029, 10, 27)))), '2029-11-27')
  assert.equal(ymd(getFutureOilMonthly(new Date(Date.UTC(2034, 0, 17)))), '2034-01-17')
  assert.equal(ymd(getFutureIndexMonthly(new Date(Date.UTC(2025, 5, 30)))), '2025-06-30')
})

test('price effect helpers preserve tastyware debit semantics', () => {
  assert.equal(getSign('-1.23'), PriceEffect.DEBIT)
  assert.equal(getSign('1.23'), PriceEffect.CREDIT)
  assert.equal(getSign('0'), null)

  const signed = setSignFor({ 'buying-power-effect': 'Debit', 'buying-power': '12.50' }, ['buying_power'])
  assert.equal(signed['buying-power'], '-12.50')
})

test('validateResponse formats tastytrade API errors', async () => {
  const response = new Response(
    JSON.stringify({ error: { errors: [{ code: 'E1', message: 'Bad request' }] } }),
    { status: 400 }
  )

  await assert.rejects(() => validateResponse(response), {
    name: 'TastytradeError',
    message: 'E1: Bad request\n'
  })
})

test('validateResponse reports non-JSON error bodies without rereading the stream', async () => {
  await assert.rejects(
    () => validateResponse(new Response('upstream auth failure', { status: 401 })),
    {
      name: 'TastytradeError',
      message: "Couldn't parse response: upstream auth failure"
    }
  )
})

test('validateAndParse requires top-level data', async () => {
  await assert.rejects(() => validateAndParse(new Response(JSON.stringify({}), { status: 200 })), TastytradeError)
  assert.deepEqual(await validateAndParse(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 })), {
    ok: true
  })
})

test('snake_case aliases expose tastyware helper names', async () => {
  assert.equal(VERSION, '11.1.0')
  assert.equal(__version__, VERSION)
  assert.equal(version_str, versionStr)
  assert.equal(ymd(get_third_friday(new Date(Date.UTC(2024, 2, 2)))), '2024-03-15')
  assert.equal(ymd(get_tasty_monthly(new Date(Date.UTC(2024, 0, 1)))), '2024-02-16')
  assert.equal(get_sign('-1.23'), PriceEffect.DEBIT)

  const signed = set_sign_for({ 'buying-power-effect': 'Debit', 'buying-power': '12.50' }, ['buying_power'])
  assert.equal(signed['buying-power'], '-12.50')

  assert.deepEqual(await validate_and_parse(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 })), {
    ok: true
  })
  await assert.rejects(
    () => validate_response(new Response(JSON.stringify({ error: { code: 'E1', message: 'Bad request' } }), { status: 400 })),
    TastytradeError
  )
})

test('utils submodule owns Python-style model, calendar, and pagination helpers', async () => {
  const model = new TastytradeData({ 'account-number': '5WT', amount: '1.25' }, { decimalFields: ['amount'] })
  assert.equal(model.account_number, '5WT')
  assert.equal(String(model.amount), '1.25')
  assert.equal(ymd(utils_get_future_fx_monthly(new Date(Date.UTC(2024, 1, 9)))), '2024-02-09')

  const paginated = await paginate(
    {
      _paginate: async (factory, url, params) => [factory({ url, page: params['page-offset'] })]
    },
    (item) => item,
    '/things',
    { 'page-offset': null, 'per-page': 250 }
  )
  assert.deepEqual(paginated, [{ url: '/things', page: null }])
})
