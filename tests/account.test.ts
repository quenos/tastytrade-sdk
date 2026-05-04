import assert from 'node:assert/strict'
import test from 'node:test'

import {
  Account,
  AccountBalance,
  AccountBalanceSnapshot,
  CurrentPosition,
  FeesInfo,
  MarginReport,
  NetLiqOhlc
} from '../src/account.js'
import {
  InstrumentType,
  NewComplexOrder,
  NewOrder,
  OrderAction,
  OrderStatus,
  OrderTimeInForce,
  OrderType,
  PlacedComplexOrder,
  PlacedComplexOrderResponse,
  PlacedOrder,
  PlacedOrderResponse
} from '../src/order.js'
import { TastytradeError, type JsonMap } from '../src/utils.js'
import { type Session } from '../src/session.js'

interface SessionCall {
  method: 'get' | 'delete' | 'post' | 'put' | 'paginate'
  url: string
  init?: RequestInit & { params?: Record<string, unknown> }
  params?: Record<string, unknown>
}

class MockSession {
  readonly calls: SessionCall[] = []

  constructor(private readonly responses: Record<string, JsonMap> = {}) {}

  async _get(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    this.calls.push({ method: 'get', url, init })
    return this.responses[url] ?? { items: [] }
  }

  async _delete(url: string, init: RequestInit = {}): Promise<void> {
    this.calls.push({ method: 'delete', url, init })
  }

  async _post(url: string, init: RequestInit = {}): Promise<JsonMap> {
    this.calls.push({ method: 'post', url, init })
    return this.responses[url] ?? {}
  }

  async _put(url: string, init: RequestInit = {}): Promise<JsonMap> {
    this.calls.push({ method: 'put', url, init })
    return this.responses[url] ?? {}
  }

  async _paginate<T>(factory: (item: JsonMap) => T, url: string, params: Record<string, unknown>): Promise<T[]> {
    this.calls.push({ method: 'paginate', url, params })
    const data = this.responses[url] ?? { items: [] }
    return ((data.items as JsonMap[] | undefined) ?? []).map(factory)
  }
}

test('Account getOrderHistory uses tastyware order URL, params, and signed wrappers', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const session = new MockSession({
    '/accounts/5WT/orders': {
      items: [{ price: '1.25', 'price-effect': 'Debit', value: '4.50', 'value-effect': 'Credit' }]
    }
  })

  const orders = await account.getOrderHistory(session as unknown as Session, {
    per_page: 25,
    page_offset: null,
    start_date: '2024-01-01',
    end_date: '2024-01-31',
    underlying_symbol: 'SPY',
    statuses: [OrderStatus.LIVE, OrderStatus.FILLED],
    futures_symbol: '/ESZ9',
    underlying_instrument_type: InstrumentType.EQUITY_OPTION,
    sort: 'Asc',
    start_at: '2024-01-01T00:00:00Z',
    end_at: '2024-01-31T23:59:59Z'
  })

  assert.deepEqual(lastCall(session), {
    method: 'paginate',
    url: '/accounts/5WT/orders',
    params: {
      'per-page': 25,
      'page-offset': null,
      'start-date': '2024-01-01',
      'end-date': '2024-01-31',
      'underlying-symbol': 'SPY',
      'status[]': ['Live', 'Filled'],
      'futures-symbol': '/ESZ9',
      'underlying-instrument-type': 'Equity Option',
      sort: 'Asc',
      'start-at': '2024-01-01T00:00:00Z',
      'end-at': '2024-01-31T23:59:59Z'
    }
  })

  const order = orders[0]
  assert.ok(order)
  assert.ok(order instanceof PlacedOrder)
  assert.equal(order.data.price, '-1.25')
  assert.equal(order.data.value, '4.50')
})

test('Account balance and position wrappers expose signed data and snake_case aliases', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const session = new MockSession({
    '/accounts/5WT/balances/USD': {
      'account-number': '5WT',
      'pending-cash': '10',
      'pending-cash-effect': 'Debit',
      'buying-power-adjustment': '5',
      'buying-power-adjustment-effect': 'Credit',
      'unsettled-cryptocurrency-fiat-amount': '2',
      'unsettled-cryptocurrency-fiat-effect': 'Debit'
    },
    '/accounts/5WT/positions': {
      items: [
        {
          symbol: 'SPY',
          'realized-day-gain': '3',
          'realized-day-gain-effect': 'Debit',
          'realized-today': '4',
          'realized-today-effect': 'Credit'
        }
      ]
    }
  })

  const balances = await account.get_balances(session as unknown as Session)
  assert.ok(balances instanceof AccountBalance)
  assert.equal(balances.account_number, '5WT')
  assert.equal(balances.accountNumber, '5WT')
  assert.equal(balances.pending_cash, '-10')
  assert.equal(balances.buying_power_adjustment, '5')
  assert.equal(balances.unsettled_cryptocurrency_fiat_amount, '-2')

  const positions = await account.a_get_positions(session as unknown as Session, {
    underlying_symbols: 'SPY',
    instrument_type: InstrumentType.EQUITY,
    include_closed: false
  })
  assert.deepEqual(lastCall(session), {
    method: 'get',
    url: '/accounts/5WT/positions',
    init: {
      params: {
        'underlying-symbol[]': ['SPY'],
        'instrument-type': 'Equity',
        'include-closed-positions': false
      }
    }
  })
  assert.ok(positions[0] instanceof CurrentPosition)
  assert.equal(positions[0]?.realized_day_gain, '-3')
  assert.equal(positions[0]?.realizedDayGain, '-3')
})

test('Account snapshots, fees, margin, and net-liq match Python defaults and wrappers', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const session = new MockSession({
    '/accounts/5WT/balance-snapshots': {
      items: [{ 'pending-cash': '1', 'pending-cash-effect': 'Debit' }]
    },
    '/accounts/5WT/transactions/total-fees': {
      'total-fees': '0.65',
      'total-fees-effect': 'Debit'
    },
    '/margin/accounts/5WT/requirements': {
      'margin-requirement': '100',
      'margin-requirement-effect': 'Debit',
      groups: [{ 'buying-power': '5', 'buying-power-effect': 'Debit' }, {}]
    },
    '/accounts/5WT/net-liq/history': {
      items: [{ open: '1', high: '2', low: '1', close: '2', time: '2024-01-02' }]
    }
  })

  const snapshots = await account.get_balance_snapshots(session as unknown as Session, { page_offset: null })
  assert.ok(snapshots[0] instanceof AccountBalanceSnapshot)
  assert.equal(snapshots[0]?.pending_cash, '-1')
  assert.deepEqual(lastCall(session), {
    method: 'paginate',
    url: '/accounts/5WT/balance-snapshots',
    params: {
      'per-page': 250,
      'page-offset': null,
      currency: 'USD',
      'end-date': undefined,
      'start-date': undefined,
      'snapshot-date': undefined,
      'time-of-day': 'EOD'
    }
  })

  const fees = await account.get_total_fees(session as unknown as Session, '2024-01-02')
  assert.ok(fees instanceof FeesInfo)
  assert.equal(fees.total_fees, '-0.65')
  assert.deepEqual(lastCall(session), {
    method: 'get',
    url: '/accounts/5WT/transactions/total-fees',
    init: { params: { date: '2024-01-02' } }
  })

  const margin = await account.a_get_margin_requirements(session as unknown as Session)
  assert.ok(margin instanceof MarginReport)
  assert.equal(margin.margin_requirement, '-100')
  assert.equal(margin.groups[0]?.data.buying_power, '-5')
  assert.deepEqual(margin.groups[1]?.data, {})

  await assert.rejects(
    account.get_net_liquidating_value_history(session as unknown as Session),
    (error: unknown) => error instanceof TastytradeError && error.message === 'Either time_back or start_time must be specified.'
  )
  const netLiq = await account.a_get_net_liquidating_value_history(session as unknown as Session, {
    start_time: new Date('2024-01-02T03:04:05.678Z')
  })
  assert.ok(netLiq[0] instanceof NetLiqOhlc)
  assert.deepEqual(lastCall(session), {
    method: 'get',
    url: '/accounts/5WT/net-liq/history',
    init: { params: { 'start-time': '2024-01-02T03:04:05Z' } }
  })
})

test('Account complex order read/delete/history methods match tastyware contracts', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const complexOrder = complexOrderPayload()
  const session = new MockSession({
    '/accounts/5WT/complex-orders/live': { items: [complexOrder] },
    '/accounts/5WT/complex-orders/42': complexOrder,
    '/accounts/5WT/complex-orders': { items: [complexOrder] }
  })

  const live = await account.getLiveComplexOrders(session as unknown as Session)
  assert.equal(lastCall(session).url, '/accounts/5WT/complex-orders/live')
  const liveOrder = live[0]
  assert.ok(liveOrder)
  assert.ok(liveOrder instanceof PlacedComplexOrder)
  assert.equal(liveOrder.orders[0]?.data.price, '-1')
  assert.equal(liveOrder.trigger_order?.data.price, '2')

  const fetched = await account.getComplexOrder(session as unknown as Session, 42)
  assert.equal(lastCall(session).url, '/accounts/5WT/complex-orders/42')
  assert.equal(fetched.orders[0]?.data.price, '-1')

  await account.deleteComplexOrder(session as unknown as Session, 42, {
    mode: 'live',
    confirm: 'DELETE_LIVE_COMPLEX_ORDER'
  })
  assert.deepEqual(lastCall(session), { method: 'delete', url: '/accounts/5WT/complex-orders/42', init: {} })

  const history = await account.getComplexOrderHistory(session as unknown as Session, {
    per_page: 10,
    page_offset: null
  })
  assert.deepEqual(lastCall(session), {
    method: 'paginate',
    url: '/accounts/5WT/complex-orders',
    params: { 'per-page': 10, 'page-offset': null }
  })
  assert.ok(history[0] instanceof PlacedComplexOrder)
})

test('Account placeOrder and replaceOrder serialize bodies and wrap signed responses', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const session = new MockSession({
    '/accounts/5WT/orders': placedOrderResponse(),
    '/accounts/5WT/orders/99': { price: '1.10', 'price-effect': 'Debit' }
  })
  const order = newOrder()

  const placed = await account.placeOrder(session as unknown as Session, order, {
    mode: 'live',
    confirm: 'PLACE_LIVE_ORDER'
  })
  assert.ok(placed instanceof PlacedOrderResponse)
  assert.equal(placed.order.data.price, '-1.25')
  assert.equal(placed.buying_power_effect.data.change_in_buying_power, '-2')
  assert.equal(placed.fee_calculation?.data.commission, '-0.65')
  assert.equal(placed.warnings?.[0]?.data.code, 'WARN')

  const placeCall = lastCall(session)
  assert.equal(placeCall.method, 'post')
  assert.equal(placeCall.url, '/accounts/5WT/orders')
  const placeBody = JSON.parse(String(placeCall.init?.body)) as JsonMap
  assert.ok(Array.isArray(placeBody.legs))
  assert.equal(placeBody.price, '1.25')
  assert.equal(placeBody['price-effect'], 'Debit')

  const replaced = await account.replaceOrder(session as unknown as Session, 99, order, {
    mode: 'live',
    confirm: 'REPLACE_LIVE_ORDER'
  })
  assert.equal(replaced.data.price, '-1.10')
  const replaceCall = lastCall(session)
  assert.equal(replaceCall.method, 'put')
  assert.equal(replaceCall.url, '/accounts/5WT/orders/99')
  const replaceBody = JSON.parse(String(replaceCall.init?.body)) as JsonMap
  assert.equal('legs' in replaceBody, false)
  assert.equal(replaceBody.price, '1.25')
  assert.equal(replaceBody['price-effect'], 'Debit')
})

test('Account live replace/delete methods require explicit confirmation before network calls', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const session = new MockSession({
    '/accounts/5WT/orders/99': { price: '1.10', 'price-effect': 'Debit' }
  })
  const order = newOrder()
  const invalidDeleteOrderIntent = {
    mode: 'live',
    confirm: 'DELETE_LIVE_COMPLEX_ORDER'
  } as unknown as Parameters<Account['deleteOrder']>[2]
  const invalidDeleteComplexOrderIntent = {
    mode: 'live',
    confirm: 'DELETE_LIVE_ORDER'
  } as unknown as Parameters<Account['deleteComplexOrder']>[2]
  const invalidReplaceOrderIntent = {
    mode: 'live',
    confirm: 'DELETE_LIVE_ORDER'
  } as unknown as Parameters<Account['replaceOrder']>[3]

  await assert.rejects(
    // @ts-expect-error omitted intent is intentionally rejected at runtime.
    account.deleteOrder(session as unknown as Session, 11),
    /Live order deletion requires \{ mode: 'live', confirm: 'DELETE_LIVE_ORDER' \}/
  )
  await assert.rejects(
    account.deleteOrder(session as unknown as Session, 11, invalidDeleteOrderIntent),
    /Live order deletion requires \{ mode: 'live', confirm: 'DELETE_LIVE_ORDER' \}/
  )
  await assert.rejects(
    // @ts-expect-error omitted intent is intentionally rejected at runtime.
    account.deleteComplexOrder(session as unknown as Session, 42),
    /Live complex order deletion requires \{ mode: 'live', confirm: 'DELETE_LIVE_COMPLEX_ORDER' \}/
  )
  await assert.rejects(
    account.deleteComplexOrder(session as unknown as Session, 42, invalidDeleteComplexOrderIntent),
    /Live complex order deletion requires \{ mode: 'live', confirm: 'DELETE_LIVE_COMPLEX_ORDER' \}/
  )
  await assert.rejects(
    // @ts-expect-error omitted intent is intentionally rejected at runtime.
    account.replaceOrder(session as unknown as Session, 99, order),
    /Live order replacement requires \{ mode: 'live', confirm: 'REPLACE_LIVE_ORDER' \}/
  )
  await assert.rejects(
    account.replaceOrder(session as unknown as Session, 99, order, invalidReplaceOrderIntent),
    /Live order replacement requires \{ mode: 'live', confirm: 'REPLACE_LIVE_ORDER' \}/
  )
  assert.equal(session.calls.filter((call) => call.method === 'delete' || call.method === 'put').length, 0)

  await account.deleteOrder(session as unknown as Session, 11, {
    mode: 'live',
    confirm: 'DELETE_LIVE_ORDER'
  })
  assert.deepEqual(lastCall(session), { method: 'delete', url: '/accounts/5WT/orders/11', init: {} })

  await account.deleteComplexOrder(session as unknown as Session, 42, {
    mode: 'live',
    confirm: 'DELETE_LIVE_COMPLEX_ORDER'
  })
  assert.deepEqual(lastCall(session), { method: 'delete', url: '/accounts/5WT/complex-orders/42', init: {} })

  const replaced = await account.replaceOrder(session as unknown as Session, 99, order, {
    mode: 'live',
    confirm: 'REPLACE_LIVE_ORDER'
  })
  assert.equal(replaced.data.price, '-1.10')
  const mutationCalls = session.calls.filter((call) => call.method === 'delete' || call.method === 'put')
  assert.deepEqual(
    mutationCalls.map((call) => ({ method: call.method, url: call.url })),
    [
      { method: 'delete', url: '/accounts/5WT/orders/11' },
      { method: 'delete', url: '/accounts/5WT/complex-orders/42' },
      { method: 'put', url: '/accounts/5WT/orders/99' }
    ]
  )
})

test('Account placeOrder defaults to dry-run and rejects legacy boolean live placement', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const session = new MockSession({
    '/accounts/5WT/orders/dry-run': placedOrderResponse()
  })
  const order = newOrder()

  await account.placeOrder(session as unknown as Session, order, { mode: 'dry-run' })
  assert.equal(lastCall(session).url, '/accounts/5WT/orders/dry-run')

  await assert.rejects(
    // @ts-expect-error legacy boolean false is intentionally not type-valid for live orders.
    account.placeOrder(session as unknown as Session, order, false),
    /Live order placement requires \{ mode: 'live', confirm: 'PLACE_LIVE_ORDER' \}/
  )
  assert.equal(session.calls.filter((call) => call.method === 'post').length, 1)
})

test('Account placeComplexOrder uses complex endpoint and response wrapper', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const session = new MockSession({
    '/accounts/5WT/complex-orders/dry-run': {
      ...placedOrderResponse(),
      'complex-order': complexOrderPayload()
    }
  })
  const child = newOrder()
  const complexOrder = new NewComplexOrder({ orders: [child], trigger_order: child })

  const placed = await account.placeComplexOrder(session as unknown as Session, complexOrder)

  assert.ok(placed instanceof PlacedComplexOrderResponse)
  assert.equal(placed.complex_order.orders[0]?.data.price, '-1')
  const call = lastCall(session)
  assert.equal(call.method, 'post')
  assert.equal(call.url, '/accounts/5WT/complex-orders/dry-run')
  const body = JSON.parse(String(call.init?.body)) as JsonMap
  assert.equal(body.type, 'OTOCO')
  assert.ok(Array.isArray(body.orders))
  assert.ok(isJsonMap(body['trigger-order']))
})

test('Account placeComplexOrder requires explicit confirmation for live placement', async () => {
  const account = new Account({ 'account-number': '5WT' })
  const session = new MockSession({
    '/accounts/5WT/complex-orders': {
      ...placedOrderResponse(),
      'complex-order': complexOrderPayload()
    }
  })
  const child = newOrder()
  const complexOrder = new NewComplexOrder({ orders: [child] })

  await assert.rejects(
    // @ts-expect-error legacy boolean false is intentionally not type-valid for live complex orders.
    account.placeComplexOrder(session as unknown as Session, complexOrder, false),
    /Live order placement requires \{ mode: 'live', confirm: 'PLACE_LIVE_ORDER' \}/
  )
  assert.equal(session.calls.length, 0)

  await account.placeComplexOrder(session as unknown as Session, complexOrder, {
    mode: 'live',
    confirm: 'PLACE_LIVE_ORDER'
  })
  assert.equal(lastCall(session).url, '/accounts/5WT/complex-orders')
})

function newOrder(): NewOrder {
  return new NewOrder({
    time_in_force: OrderTimeInForce.DAY,
    order_type: OrderType.LIMIT,
    price: '-1.25',
    legs: [
      {
        instrument_type: InstrumentType.EQUITY,
        symbol: 'SPY',
        action: OrderAction.BUY,
        quantity: 1
      }
    ]
  })
}

function placedOrderResponse(): JsonMap {
  return {
    'buying-power-effect': {
      'change-in-margin-requirement': '1',
      'change-in-margin-requirement-effect': 'Debit',
      'change-in-buying-power': '2',
      'change-in-buying-power-effect': 'Debit',
      'current-buying-power': '100',
      'new-buying-power': '98',
      'isolated-order-margin-requirement': '3',
      'isolated-order-margin-requirement-effect': 'Debit'
    },
    order: { price: '1.25', 'price-effect': 'Debit' },
    'fee-calculation': {
      commission: '0.65',
      'commission-effect': 'Debit',
      'total-fees': '0.65',
      'total-fees-effect': 'Debit'
    },
    warnings: [{ code: 'WARN', message: 'check order' }],
    errors: []
  }
}

function complexOrderPayload(): JsonMap {
  return {
    id: 42,
    'account-number': '5WT',
    type: 'OCO',
    orders: [{ price: '1', 'price-effect': 'Debit' }],
    'trigger-order': { price: '2', 'price-effect': 'Credit' }
  }
}

function lastCall(session: MockSession): SessionCall {
  const call = session.calls.at(-1)
  assert.ok(call)
  return call
}

function isJsonMap(value: unknown): value is JsonMap {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
