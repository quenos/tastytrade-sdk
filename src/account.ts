import {
  NewComplexOrder,
  NewOrder,
  PlacedComplexOrder,
  PlacedComplexOrderResponse,
  PlacedOrder,
  PlacedOrderResponse,
  type InstrumentType,
  type OrderStatus
} from './order.js'
import { Session } from './session.js'
import {
  camelize,
  intuitiveIterable,
  parseTastyObject,
  PriceEffect,
  setSignFor,
  TastytradeError,
  type JsonMap
} from './utils.js'

const TT_DATE_FMT_RE = /\.\d{3}Z$/

type SignedFieldList = readonly string[]

export type OrderPlacementOptions =
  | { mode: 'dry-run' }
  | { mode: 'live'; confirm: 'PLACE_LIVE_ORDER' }

type OrderPlacementIntent = true | OrderPlacementOptions

export type DeleteOrderIntent = { mode: 'live'; confirm: 'DELETE_LIVE_ORDER' }
export type DeleteComplexOrderIntent = { mode: 'live'; confirm: 'DELETE_LIVE_COMPLEX_ORDER' }
export type ReplaceOrderIntent = { mode: 'live'; confirm: 'REPLACE_LIVE_ORDER' }

export class AccountBalance {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseAccountBalance(data, ['pending_cash', 'buying_power_adjustment'])
    assignData(this, this.data)
  }
}

export class AccountBalanceSnapshot {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseAccountBalance(data, ['pending_cash'])
    assignData(this, this.data)
  }
}

export class CurrentPosition {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseSigned(data, ['realized_day_gain', 'realized_today'])
    assignData(this, this.data)
  }
}

export class FeesInfo {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseSigned(data, ['total_fees'])
    assignData(this, this.data)
  }
}

export class Lot {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
  }
}

export class EmptyDict {
  readonly data: JsonMap

  constructor(data: JsonMap = {}) {
    this.data = parseTastyObject(data)
  }
}

export class MarginReportEntry {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseSigned(data, [
      'buying_power',
      'margin_requirement',
      'initial_requirement',
      'maintenance_requirement'
    ])
    assignData(this, this.data)
  }
}

export class MarginReport {
  [key: string]: unknown
  readonly data: JsonMap
  groups: Array<MarginReportEntry | EmptyDict>

  constructor(data: JsonMap) {
    this.data = parseSigned(data, [
      'maintenance_requirement',
      'margin_requirement',
      'margin_equity',
      'maintenance_excess',
      'option_buying_power',
      'reg_t_margin_requirement',
      'reg_t_option_buying_power',
      'initial_requirement'
    ])
    assignData(this, this.data)
    this.groups = Array.isArray(this.data.groups)
      ? (this.data.groups as JsonMap[]).map((group) =>
          Object.keys(group).length === 0 ? new EmptyDict(group) : new MarginReportEntry(group)
        )
      : []
  }
}

export class NetLiqOhlc {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
  }
}

export class TradingStatus {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
  }
}

export class Transaction {
  [key: string]: unknown
  readonly data: JsonMap
  lots: Lot[] | null

  constructor(data: JsonMap) {
    this.data = parseSigned(data, [
      'value',
      'net_value',
      'regulatory_fees',
      'clearing_fees',
      'proprietary_index_option_fees',
      'commission',
      'other_charge'
    ])
    assignData(this, this.data)
    this.lots = Array.isArray(this.data.lots) ? (this.data.lots as JsonMap[]).map((lot) => new Lot(lot)) : null
  }
}

export class Account {
  [key: string]: unknown
  account_number: string
  accountNumber: string
  data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
    this.account_number = String(this.data.account_number)
    this.accountNumber = this.account_number
  }

  static async get(session: Session, accountNumber?: string, includeClosed = false): Promise<Account | Account[]> {
    if (accountNumber) {
      return new Account(await session._get(`/customers/me/accounts/${accountNumber}`))
    }
    const data = await session._get('/customers/me/accounts')
    const items = (data.items as JsonMap[] | undefined) ?? []
    return items
      .map((item) => item.account as JsonMap)
      .filter((account) => includeClosed || account['is-closed'] !== true)
      .map((account) => new Account(account))
  }

  static async a_get(session: Session, accountNumber?: string, includeClosed = false): Promise<Account | Account[]> {
    return Account.get(session, accountNumber, includeClosed)
  }

  async getTradingStatus(session: Session): Promise<TradingStatus> {
    return new TradingStatus(await session._get(`/accounts/${this.account_number}/trading-status`))
  }

  async get_trading_status(session: Session): Promise<TradingStatus> {
    return this.getTradingStatus(session)
  }

  async a_get_trading_status(session: Session): Promise<TradingStatus> {
    return this.getTradingStatus(session)
  }

  async getBalances(session: Session, currency = 'USD'): Promise<AccountBalance> {
    return new AccountBalance(await session._get(`/accounts/${this.account_number}/balances/${currency}`))
  }

  async get_balances(session: Session, currency = 'USD'): Promise<AccountBalance> {
    return this.getBalances(session, currency)
  }

  async a_get_balances(session: Session, currency = 'USD'): Promise<AccountBalance> {
    return this.getBalances(session, currency)
  }

  async getBalanceSnapshots(
    session: Session,
    params: {
      per_page?: number
      page_offset?: number | null
      currency?: string
      end_date?: string
      start_date?: string
      snapshot_date?: string
      time_of_day?: 'BOD' | 'EOD'
    } = {}
  ): Promise<AccountBalanceSnapshot[]> {
    return session._paginate(
      (item) => new AccountBalanceSnapshot(item),
      `/accounts/${this.account_number}/balance-snapshots`,
      {
        'per-page': params.per_page ?? 250,
        'page-offset': params.page_offset === undefined ? 0 : params.page_offset,
        currency: params.currency ?? 'USD',
        'end-date': params.end_date,
        'start-date': params.start_date,
        'snapshot-date': params.snapshot_date,
        'time-of-day': params.time_of_day ?? 'EOD'
      }
    )
  }

  async get_balance_snapshots(
    session: Session,
    params: Parameters<Account['getBalanceSnapshots']>[1] = {}
  ): Promise<AccountBalanceSnapshot[]> {
    return this.getBalanceSnapshots(session, params)
  }

  async a_get_balance_snapshots(
    session: Session,
    params: Parameters<Account['getBalanceSnapshots']>[1] = {}
  ): Promise<AccountBalanceSnapshot[]> {
    return this.getBalanceSnapshots(session, params)
  }

  async getPositions(
    session: Session,
    params: {
      underlying_symbols?: Iterable<string> | string
      symbol?: string
      instrument_type?: { valueOf(): string } | string
      include_closed?: boolean
      underlying_product_code?: string
      partition_keys?: Iterable<string> | string
      net_positions?: boolean
      include_marks?: boolean
    } = {}
  ): Promise<CurrentPosition[]> {
    const data = await session._get(`/accounts/${this.account_number}/positions`, {
      params: compactParams({
        'underlying-symbol[]': params.underlying_symbols ? Array.from(intuitiveIterable(params.underlying_symbols)) : undefined,
        symbol: params.symbol,
        'instrument-type': params.instrument_type ? String(params.instrument_type) : undefined,
        'include-closed-positions': params.include_closed,
        'underlying-product-code': params.underlying_product_code,
        'partition-keys[]': params.partition_keys ? Array.from(intuitiveIterable(params.partition_keys)) : undefined,
        'net-positions': params.net_positions,
        'include-marks': params.include_marks
      })
    })
    return ((data.items as JsonMap[] | undefined) ?? []).map((item) => new CurrentPosition(item))
  }

  async get_positions(session: Session, params: Parameters<Account['getPositions']>[1] = {}): Promise<CurrentPosition[]> {
    return this.getPositions(session, params)
  }

  async a_get_positions(session: Session, params: Parameters<Account['getPositions']>[1] = {}): Promise<CurrentPosition[]> {
    return this.getPositions(session, params)
  }

  async getHistory(
    session: Session,
    params: {
      per_page?: number
      page_offset?: number | null
      sort?: 'Asc' | 'Desc'
      type?: string
      types?: Iterable<string> | string
      sub_types?: Iterable<string> | string
      start_date?: string
      end_date?: string
      instrument_type?: { valueOf(): string } | string
      symbol?: string
      underlying_symbol?: string
      action?: string
      partition_key?: string
      futures_symbol?: string
      start_at?: string
      end_at?: string
    } = {}
  ): Promise<Transaction[]> {
    return session._paginate(
      (item) => new Transaction(item),
      `/accounts/${this.account_number}/transactions`,
      {
        'per-page': params.per_page ?? 250,
        'page-offset': params.page_offset === undefined ? 0 : params.page_offset,
        sort: params.sort ?? 'Desc',
        type: params.type,
        'types[]': params.types ? Array.from(intuitiveIterable(params.types)) : undefined,
        'sub-type[]': params.sub_types ? Array.from(intuitiveIterable(params.sub_types)) : undefined,
        'start-date': params.start_date,
        'end-date': params.end_date,
        'instrument-type': params.instrument_type ? String(params.instrument_type) : undefined,
        symbol: params.symbol,
        'underlying-symbol': params.underlying_symbol,
        action: params.action,
        'partition-key': params.partition_key,
        'futures-symbol': params.futures_symbol,
        'start-at': params.start_at,
        'end-at': params.end_at
      }
    )
  }

  async get_history(session: Session, params: Parameters<Account['getHistory']>[1] = {}): Promise<Transaction[]> {
    return this.getHistory(session, params)
  }

  async a_get_history(session: Session, params: Parameters<Account['getHistory']>[1] = {}): Promise<Transaction[]> {
    return this.getHistory(session, params)
  }

  async getTransaction(session: Session, id: number): Promise<Transaction> {
    return new Transaction(await session._get(`/accounts/${this.account_number}/transactions/${id}`))
  }

  async get_transaction(session: Session, id: number): Promise<Transaction> {
    return this.getTransaction(session, id)
  }

  async a_get_transaction(session: Session, id: number): Promise<Transaction> {
    return this.getTransaction(session, id)
  }

  async getTotalFees(session: Session, day: string | Date = todayInNewYork()): Promise<FeesInfo> {
    return new FeesInfo(
      await session._get(`/accounts/${this.account_number}/transactions/total-fees`, {
        params: { date: formatDate(day) }
      })
    )
  }

  async get_total_fees(session: Session, day: string | Date = todayInNewYork()): Promise<FeesInfo> {
    return this.getTotalFees(session, day)
  }

  async a_get_total_fees(session: Session, day: string | Date = todayInNewYork()): Promise<FeesInfo> {
    return this.getTotalFees(session, day)
  }

  async getNetLiquidatingValueHistory(
    session: Session,
    params: { time_back?: string; start_time?: string | Date } = {}
  ): Promise<NetLiqOhlc[]> {
    if (params.start_time === undefined && params.time_back === undefined) {
      throw new TastytradeError('Either time_back or start_time must be specified.')
    }
    const query =
      params.start_time !== undefined ? { 'start-time': formatTastyDateTime(params.start_time) } : { 'time-back': params.time_back }
    const data = await session._get(`/accounts/${this.account_number}/net-liq/history`, { params: query })
    return ((data.items as JsonMap[] | undefined) ?? []).map((item) => new NetLiqOhlc(item))
  }

  async get_net_liquidating_value_history(
    session: Session,
    params: Parameters<Account['getNetLiquidatingValueHistory']>[1] = {}
  ): Promise<NetLiqOhlc[]> {
    return this.getNetLiquidatingValueHistory(session, params)
  }

  async a_get_net_liquidating_value_history(
    session: Session,
    params: Parameters<Account['getNetLiquidatingValueHistory']>[1] = {}
  ): Promise<NetLiqOhlc[]> {
    return this.getNetLiquidatingValueHistory(session, params)
  }

  async getMarginRequirements(session: Session): Promise<MarginReport> {
    return new MarginReport(await session._get(`/margin/accounts/${this.account_number}/requirements`))
  }

  async get_margin_requirements(session: Session): Promise<MarginReport> {
    return this.getMarginRequirements(session)
  }

  async a_get_margin_requirements(session: Session): Promise<MarginReport> {
    return this.getMarginRequirements(session)
  }

  async getLiveOrders(session: Session): Promise<PlacedOrder[]> {
    const data = await session._get(`/accounts/${this.account_number}/orders/live`)
    return ((data.items as JsonMap[] | undefined) ?? []).map((item) => new PlacedOrder(item))
  }

  async get_live_orders(session: Session): Promise<PlacedOrder[]> {
    return this.getLiveOrders(session)
  }

  async a_get_live_orders(session: Session): Promise<PlacedOrder[]> {
    return this.getLiveOrders(session)
  }

  async getLiveComplexOrders(session: Session): Promise<PlacedComplexOrder[]> {
    const data = await session._get(`/accounts/${this.account_number}/complex-orders/live`)
    return ((data.items as JsonMap[] | undefined) ?? []).map((item) => new PlacedComplexOrder(item))
  }

  async get_live_complex_orders(session: Session): Promise<PlacedComplexOrder[]> {
    return this.getLiveComplexOrders(session)
  }

  async a_get_live_complex_orders(session: Session): Promise<PlacedComplexOrder[]> {
    return this.getLiveComplexOrders(session)
  }

  async getComplexOrder(session: Session, orderId: number): Promise<PlacedComplexOrder> {
    return new PlacedComplexOrder(await session._get(`/accounts/${this.account_number}/complex-orders/${orderId}`))
  }

  async get_complex_order(session: Session, orderId: number): Promise<PlacedComplexOrder> {
    return this.getComplexOrder(session, orderId)
  }

  async a_get_complex_order(session: Session, orderId: number): Promise<PlacedComplexOrder> {
    return this.getComplexOrder(session, orderId)
  }

  async getOrder(session: Session, orderId: number): Promise<PlacedOrder> {
    return new PlacedOrder(await session._get(`/accounts/${this.account_number}/orders/${orderId}`))
  }

  async get_order(session: Session, orderId: number): Promise<PlacedOrder> {
    return this.getOrder(session, orderId)
  }

  async a_get_order(session: Session, orderId: number): Promise<PlacedOrder> {
    return this.getOrder(session, orderId)
  }

  async deleteComplexOrder(session: Session, orderId: number, intent: DeleteComplexOrderIntent): Promise<void> {
    requireLiveOrderMutationIntent(intent, 'DELETE_LIVE_COMPLEX_ORDER', 'complex order deletion')
    await session._delete(`/accounts/${this.account_number}/complex-orders/${orderId}`)
  }

  async delete_complex_order(session: Session, orderId: number, intent: DeleteComplexOrderIntent): Promise<void> {
    return this.deleteComplexOrder(session, orderId, intent)
  }

  async a_delete_complex_order(session: Session, orderId: number, intent: DeleteComplexOrderIntent): Promise<void> {
    return this.deleteComplexOrder(session, orderId, intent)
  }

  async deleteOrder(session: Session, orderId: number, intent: DeleteOrderIntent): Promise<void> {
    requireLiveOrderMutationIntent(intent, 'DELETE_LIVE_ORDER', 'order deletion')
    await session._delete(`/accounts/${this.account_number}/orders/${orderId}`)
  }

  async delete_order(session: Session, orderId: number, intent: DeleteOrderIntent): Promise<void> {
    return this.deleteOrder(session, orderId, intent)
  }

  async a_delete_order(session: Session, orderId: number, intent: DeleteOrderIntent): Promise<void> {
    return this.deleteOrder(session, orderId, intent)
  }

  async getOrderHistory(
    session: Session,
    params: {
      per_page?: number
      page_offset?: number | null
      start_date?: string
      end_date?: string
      underlying_symbol?: string
      statuses?: Iterable<OrderStatus | string> | OrderStatus | string
      futures_symbol?: string
      underlying_instrument_type?: InstrumentType | string | { valueOf(): string }
      sort?: 'Asc' | 'Desc'
      start_at?: string
      end_at?: string
    } = {}
  ): Promise<PlacedOrder[]> {
    return session._paginate((item) => new PlacedOrder(item), `/accounts/${this.account_number}/orders`, {
      'per-page': params.per_page ?? 50,
      'page-offset': params.page_offset === undefined ? 0 : params.page_offset,
      'start-date': params.start_date,
      'end-date': params.end_date,
      'underlying-symbol': params.underlying_symbol,
      'status[]': params.statuses ? Array.from(intuitiveIterable(params.statuses)).map(String) : undefined,
      'futures-symbol': params.futures_symbol,
      'underlying-instrument-type': params.underlying_instrument_type
        ? String(params.underlying_instrument_type)
        : undefined,
      sort: params.sort,
      'start-at': params.start_at,
      'end-at': params.end_at
    })
  }

  async get_order_history(session: Session, params: Parameters<Account['getOrderHistory']>[1] = {}): Promise<PlacedOrder[]> {
    return this.getOrderHistory(session, params)
  }

  async a_get_order_history(session: Session, params: Parameters<Account['getOrderHistory']>[1] = {}): Promise<PlacedOrder[]> {
    return this.getOrderHistory(session, params)
  }

  async getComplexOrderHistory(
    session: Session,
    params: { per_page?: number; page_offset?: number | null } = {}
  ): Promise<PlacedComplexOrder[]> {
    return session._paginate((item) => new PlacedComplexOrder(item), `/accounts/${this.account_number}/complex-orders`, {
      'per-page': params.per_page ?? 50,
      'page-offset': params.page_offset === undefined ? 0 : params.page_offset
    })
  }

  async get_complex_order_history(
    session: Session,
    params: Parameters<Account['getComplexOrderHistory']>[1] = {}
  ): Promise<PlacedComplexOrder[]> {
    return this.getComplexOrderHistory(session, params)
  }

  async a_get_complex_order_history(
    session: Session,
    params: Parameters<Account['getComplexOrderHistory']>[1] = {}
  ): Promise<PlacedComplexOrder[]> {
    return this.getComplexOrderHistory(session, params)
  }

  async placeOrder(session: Session, order: NewOrder, intent: OrderPlacementIntent = { mode: 'dry-run' }): Promise<PlacedOrderResponse> {
    let url = `/accounts/${this.account_number}/orders`
    if (isDryRunOrderPlacement(intent)) url += '/dry-run'
    return new PlacedOrderResponse(await session._post(url, { body: order.toApiJSON() }))
  }

  async place_order(session: Session, order: NewOrder, intent: OrderPlacementIntent = { mode: 'dry-run' }): Promise<PlacedOrderResponse> {
    return this.placeOrder(session, order, intent)
  }

  async a_place_order(session: Session, order: NewOrder, intent: OrderPlacementIntent = { mode: 'dry-run' }): Promise<PlacedOrderResponse> {
    return this.placeOrder(session, order, intent)
  }

  async getOrderBuyingPowerEffect(session: Session, order: NewOrder): Promise<JsonMap> {
    const data = await session._post(`/accounts/${this.account_number}/orders/dry-run`, {
      body: order.toApiJSON()
    })
    return parseTastyObject((data['buying-power-effect'] as JsonMap | undefined) ?? data)
  }

  async get_order_buying_power_effect(session: Session, order: NewOrder): Promise<JsonMap> {
    return this.getOrderBuyingPowerEffect(session, order)
  }

  async placeComplexOrder(
    session: Session,
    order: NewComplexOrder,
    intent: OrderPlacementIntent = { mode: 'dry-run' }
  ): Promise<PlacedComplexOrderResponse> {
    let url = `/accounts/${this.account_number}/complex-orders`
    if (isDryRunOrderPlacement(intent)) url += '/dry-run'
    return new PlacedComplexOrderResponse(await session._post(url, { body: order.toApiJSON() }))
  }

  async place_complex_order(
    session: Session,
    order: NewComplexOrder,
    intent: OrderPlacementIntent = { mode: 'dry-run' }
  ): Promise<PlacedComplexOrderResponse> {
    return this.placeComplexOrder(session, order, intent)
  }

  async a_place_complex_order(
    session: Session,
    order: NewComplexOrder,
    intent: OrderPlacementIntent = { mode: 'dry-run' }
  ): Promise<PlacedComplexOrderResponse> {
    return this.placeComplexOrder(session, order, intent)
  }

  async replaceOrder(
    session: Session,
    oldOrderId: number,
    newOrder: NewOrder,
    intent: ReplaceOrderIntent
  ): Promise<PlacedOrder> {
    requireLiveOrderMutationIntent(intent, 'REPLACE_LIVE_ORDER', 'order replacement')
    const data = await session._put(`/accounts/${this.account_number}/orders/${oldOrderId}`, {
      body: newOrder.toApiJSON({ exclude: ['legs'] })
    })
    return new PlacedOrder(data)
  }

  async replace_order(
    session: Session,
    oldOrderId: number,
    newOrder: NewOrder,
    intent: ReplaceOrderIntent
  ): Promise<PlacedOrder> {
    return this.replaceOrder(session, oldOrderId, newOrder, intent)
  }

  async a_replace_order(
    session: Session,
    oldOrderId: number,
    newOrder: NewOrder,
    intent: ReplaceOrderIntent
  ): Promise<PlacedOrder> {
    return this.replaceOrder(session, oldOrderId, newOrder, intent)
  }
}

function parseSigned(data: JsonMap, fields: SignedFieldList): JsonMap {
  return parseTastyObject(setSignFor(data, [...fields]))
}

function parseAccountBalance(data: JsonMap, fields: SignedFieldList): JsonMap {
  const signed = setSignFor(data, [...fields, 'unsettled_cryptocurrency_fiat_amount'])
  const effect = signed['unsettled-cryptocurrency-fiat-effect'] ?? signed.unsettled_cryptocurrency_fiat_effect
  const raw = signed['unsettled-cryptocurrency-fiat-amount'] ?? signed.unsettled_cryptocurrency_fiat_amount
  if (effect === PriceEffect.DEBIT && raw !== null && raw !== undefined) {
    signed['unsettled-cryptocurrency-fiat-amount'] = String(raw).startsWith('-') ? String(raw) : `-${raw}`
  }
  return parseTastyObject(signed)
}

function assignData(target: Record<string, unknown>, data: JsonMap): void {
  Object.assign(target, data)
  for (const [key, value] of Object.entries(data)) {
    if (key.includes('_')) {
      target[camelize(key)] = value
    }
  }
}

function compactParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== null && value !== undefined))
}

function isDryRunOrderPlacement(intent: OrderPlacementIntent | false): boolean {
  if (intent === true) return true
  if (intent === false) throw liveOrderConfirmationError()
  if (intent.mode === 'dry-run') return true
  if (intent.mode === 'live' && intent.confirm === 'PLACE_LIVE_ORDER') return false
  throw liveOrderConfirmationError()
}

function liveOrderConfirmationError(): TypeError {
  return new TypeError("Live order placement requires { mode: 'live', confirm: 'PLACE_LIVE_ORDER' }.")
}

function requireLiveOrderMutationIntent(intent: unknown, confirm: string, operation: string): void {
  if (isObjectRecord(intent) && intent.mode === 'live' && intent.confirm === confirm) return
  throw new TypeError(`Live ${operation} requires { mode: 'live', confirm: '${confirm}' }.`)
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function todayInNewYork(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function formatDate(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value
}

function formatTastyDateTime(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().replace(TT_DATE_FMT_RE, 'Z')
  return value
}
