import assert from 'node:assert/strict'
import test from 'node:test'

import { versionStr } from '../src/constants.js'
import {
  AdvancedInstructions,
  FillInfo,
  InstrumentType,
  Leg,
  Message,
  NewComplexOrder,
  NewOrder,
  OrderAction,
  OrderCondition,
  OrderTimeInForce,
  OrderType,
  PlacedOrder,
  TradeableTastytradeData
} from '../src/order.js'

test('NewOrder serializes signed price as absolute price plus effect', () => {
  const order = new NewOrder({
    time_in_force: OrderTimeInForce.DAY,
    order_type: OrderType.LIMIT,
    price: '-1.25',
    legs: [
      new Leg({
        instrument_type: InstrumentType.EQUITY_OPTION,
        symbol: 'SPY   240324P00480500',
        action: OrderAction.BUY_TO_OPEN,
        quantity: 1
      })
    ]
  })

  assert.deepEqual(JSON.parse(order.toApiJSON()), {
    'time-in-force': 'Day',
    'order-type': 'Limit',
    source: versionStr,
    legs: [
      {
        'instrument-type': 'Equity Option',
        symbol: 'SPY   240324P00480500',
        action: 'Buy to Open',
        quantity: '1'
      }
    ],
    price: '1.25',
    'price-effect': 'Debit'
  })
})

test('NewComplexOrder becomes OTOCO when trigger order is present', () => {
  const child = new NewOrder({
    time_in_force: OrderTimeInForce.DAY,
    order_type: OrderType.MARKET,
    legs: [{ instrument_type: InstrumentType.EQUITY, symbol: 'SPY', action: OrderAction.BUY, quantity: 1 }]
  })
  const complex = new NewComplexOrder({ orders: [child], trigger_order: child })

  assert.equal(complex.type, 'OTOCO')
})

test('order models expose Python snake_case fields and camelCase aliases', () => {
  const fill = new FillInfo({
    'fill-id': 'abc',
    quantity: '2',
    'fill-price': '1.05',
    'filled-at': '2024-01-02T15:30:00Z',
    'destination-venue': 'CBOE',
    'ext-group-fill-id': 'group',
    'ext-exec-id': 'exec'
  })
  assert.equal(fill.fill_id, 'abc')
  assert.equal(fill.fillId, 'abc')
  assert.equal(fill.fill_price.toString(), '1.05')
  assert.equal(fill.fillPrice.toString(), '1.05')

  const leg = new Leg({
    instrumentType: InstrumentType.EQUITY,
    symbol: 'SPY',
    action: OrderAction.BUY,
    remainingQuantity: 1,
    fills: [fill]
  })
  assert.equal(leg.instrument_type, InstrumentType.EQUITY)
  assert.equal(leg.instrumentType, InstrumentType.EQUITY)
  assert.equal(leg.remaining_quantity?.toString(), '1')
  assert.equal(leg.remainingQuantity?.toString(), '1')
  assert.equal(leg.fills?.[0]?.fill_id, 'abc')

  const message = new Message({ code: 'WARN', message: 'check', 'preflight-id': 'pf' })
  assert.equal(message.preflight_id, 'pf')
  assert.equal(message.preflightId, 'pf')
  assert.equal(String(message), 'WARN: check')
})

test('advanced instructions and order conditions serialize/wrap Python fields', () => {
  const rule = {
    route_after: '2024-01-02T15:00:00Z',
    routed_at: '2024-01-02T15:01:00Z',
    cancel_at: '2024-01-02T16:00:00Z',
    cancelled_at: '2024-01-02T16:01:00Z',
    order_conditions: []
  }
  const advanced = new AdvancedInstructions({ strictPositionEffectValidation: true })
  const order = new NewOrder({
    timeInForce: OrderTimeInForce.DAY,
    orderType: OrderType.MARKET,
    advancedInstructions: advanced,
    rules: rule,
    legs: [{ instrumentType: InstrumentType.EQUITY, symbol: 'SPY', action: OrderAction.BUY, quantity: 1 }]
  })
  assert.deepEqual(JSON.parse(order.toApiJSON()), {
    'time-in-force': 'Day',
    'order-type': 'Market',
    source: versionStr,
    legs: [
      {
        'instrument-type': 'Equity',
        symbol: 'SPY',
        action: 'Buy',
        quantity: '1'
      }
    ],
    rules: {
      'route-after': '2024-01-02T15:00:00Z',
      'routed-at': '2024-01-02T15:01:00Z',
      'cancel-at': '2024-01-02T16:00:00Z',
      'cancelled-at': '2024-01-02T16:01:00Z',
      'order-conditions': []
    },
    'advanced-instructions': {
      'strict-position-effect-validation': true
    }
  })

  const condition = new OrderCondition({
    id: 'rule',
    action: 'Route',
    symbol: 'SPY',
    'instrument-type': 'Equity',
    indicator: 'Last',
    comparator: '>=',
    threshold: '500',
    'is-threshold-based-on-notional': false,
    'triggered-at': '2024-01-02T15:30:00Z',
    'triggered-value': '501',
    'price-components': [
      {
        symbol: 'SPY',
        'instrument-type': 'Equity',
        quantity: '1',
        'quantity-direction': 'Long'
      }
    ]
  })
  assert.equal(condition.is_threshold_based_on_notional, false)
  assert.equal(condition.isThresholdBasedOnNotional, false)
  assert.equal(condition.price_components[0]?.quantity_direction, 'Long')
  assert.equal(condition.priceComponents[0]?.quantityDirection, 'Long')
})

test('placed order assigns signed fields, legs, order rule, and aliases', () => {
  const placed = new PlacedOrder({
    'account-number': '5WT',
    price: '1.25',
    'price-effect': 'Debit',
    legs: [
      {
        'instrument-type': 'Equity',
        symbol: 'SPY',
        action: 'Buy',
        quantity: '1',
        fills: [{ 'fill-id': 'abc', quantity: '1', 'fill-price': '1.20', 'filled-at': '2024-01-02T15:30:00Z' }]
      }
    ],
    'order-rule': {
      'route-after': '2024-01-02T15:00:00Z',
      'routed-at': '2024-01-02T15:01:00Z',
      'cancel-at': '2024-01-02T16:00:00Z',
      'cancelled-at': '2024-01-02T16:01:00Z',
      'order-conditions': []
    }
  })

  assert.equal(placed.account_number, '5WT')
  assert.equal(placed.accountNumber, '5WT')
  assert.equal(placed.data.price, '-1.25')
  assert.equal(placed.price, '-1.25')
  assert.equal(placed.legs[0]?.fills?.[0]?.fill_id, 'abc')
  assert.equal(placed.order_rule?.order_conditions.length, 0)
  assert.equal(placed.orderRule?.orderConditions.length, 0)
})

test('order module exposes TradeableTastytradeData with build_leg parity', () => {
  const instrument = new TradeableTastytradeData(
    { symbol: 'SPY', instrument_type: InstrumentType.EQUITY },
    InstrumentType.UNKNOWN
  )

  const leg = instrument.build_leg(5, OrderAction.BUY)

  assert.equal(leg.symbol, 'SPY')
  assert.equal(leg.instrument_type, InstrumentType.EQUITY)
  assert.equal(leg.quantity?.toString(), '5')
})
