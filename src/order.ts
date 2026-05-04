import { versionStr } from './constants.js'
import { DecimalValue, type DecimalInput } from './decimal.js'
import {
  camelize,
  dasherize,
  getAliasValue,
  getSign,
  parseTastyObject,
  PriceEffect,
  setSignFor,
  TastytradeData,
  toApiObject,
  type TastytradeDataOptions,
  type JsonMap
} from './utils.js'

export enum InstrumentType {
  BOND = 'Bond',
  CRYPTOCURRENCY = 'Cryptocurrency',
  CURRENCY_PAIR = 'Currency Pair',
  EQUITY = 'Equity',
  EQUITY_OFFERING = 'Equity Offering',
  EQUITY_OPTION = 'Equity Option',
  FIXED_INCOME = 'Fixed Income Security',
  FUTURE = 'Future',
  FUTURE_OPTION = 'Future Option',
  INDEX = 'Index',
  LIQUIDITY_POOL = 'Liquidity Pool',
  UNKNOWN = 'Unknown',
  WARRANT = 'Warrant'
}

export enum OrderAction {
  BUY_TO_OPEN = 'Buy to Open',
  BUY_TO_CLOSE = 'Buy to Close',
  SELL_TO_OPEN = 'Sell to Open',
  SELL_TO_CLOSE = 'Sell to Close',
  BUY = 'Buy',
  SELL = 'Sell'
}

export enum OrderStatus {
  RECEIVED = 'Received',
  CANCELLED = 'Cancelled',
  FILLED = 'Filled',
  EXPIRED = 'Expired',
  LIVE = 'Live',
  REJECTED = 'Rejected',
  CONTINGENT = 'Contingent',
  ROUTED = 'Routed',
  IN_FLIGHT = 'In Flight',
  CANCEL_REQUESTED = 'Cancel Requested',
  REPLACE_REQUESTED = 'Replace Requested',
  REMOVED = 'Removed',
  PARTIALLY_REMOVED = 'Partially Removed'
}

export enum OrderTimeInForce {
  DAY = 'Day',
  GTC = 'GTC',
  GTD = 'GTD',
  EXT = 'Ext',
  GTC_EXT = 'GTC Ext',
  IOC = 'IOC'
}

export enum OrderType {
  LIMIT = 'Limit',
  MARKET = 'Market',
  MARKETABLE_LIMIT = 'Marketable Limit',
  STOP = 'Stop',
  STOP_LIMIT = 'Stop Limit',
  NOTIONAL_MARKET = 'Notional Market'
}

export enum ComplexOrderType {
  OCO = 'OCO',
  OTOCO = 'OTOCO'
}

export interface FillInfoInput {
  fill_id?: string
  fillId?: string
  quantity?: DecimalInput
  fill_price?: DecimalInput
  fillPrice?: DecimalInput
  filled_at?: string | Date
  filledAt?: string | Date
  destination_venue?: string | null
  destinationVenue?: string | null
  ext_group_fill_id?: string | null
  extGroupFillId?: string | null
  ext_exec_id?: string | null
  extExecId?: string | null
  [key: string]: unknown
}

export class FillInfo {
  [key: string]: unknown
  readonly data: JsonMap
  fill_id: string
  fillId: string
  quantity: DecimalValue
  fill_price: DecimalValue
  fillPrice: DecimalValue
  filled_at: string | Date
  filledAt: string | Date
  destination_venue: string | null
  destinationVenue: string | null
  ext_group_fill_id: string | null
  extGroupFillId: string | null
  ext_exec_id: string | null
  extExecId: string | null

  constructor(input: FillInfoInput | JsonMap) {
    this.data = parseTastyObject(input as JsonMap)
    assignData(this, this.data)
    this.fill_id = String(getAliasValue(this.data, 'fill_id') ?? '')
    this.fillId = this.fill_id
    this.quantity = new DecimalValue((getAliasValue(this.data, 'quantity') ?? 0) as DecimalInput)
    this.fill_price = new DecimalValue((getAliasValue(this.data, 'fill_price') ?? 0) as DecimalInput)
    this.fillPrice = this.fill_price
    this.filled_at = (getAliasValue(this.data, 'filled_at') as string | Date | undefined) ?? ''
    this.filledAt = this.filled_at
    this.destination_venue = (getAliasValue(this.data, 'destination_venue') as string | null | undefined) ?? null
    this.destinationVenue = this.destination_venue
    this.ext_group_fill_id = (getAliasValue(this.data, 'ext_group_fill_id') as string | null | undefined) ?? null
    this.extGroupFillId = this.ext_group_fill_id
    this.ext_exec_id = (getAliasValue(this.data, 'ext_exec_id') as string | null | undefined) ?? null
    this.extExecId = this.ext_exec_id
  }

  toJSON(): JsonMap {
    return {
      fill_id: this.fill_id,
      quantity: this.quantity,
      fill_price: this.fill_price,
      filled_at: this.filled_at,
      destination_venue: this.destination_venue,
      ext_group_fill_id: this.ext_group_fill_id,
      ext_exec_id: this.ext_exec_id
    }
  }
}

export interface LegInput {
  instrument_type?: InstrumentType
  instrumentType?: InstrumentType
  symbol: string
  action: OrderAction
  quantity?: DecimalInput | null
  remaining_quantity?: DecimalInput | null
  remainingQuantity?: DecimalInput | null
  fills?: (FillInfo | FillInfoInput | JsonMap)[] | null
  [key: string]: unknown
}

export class Leg {
  [key: string]: unknown
  instrument_type: InstrumentType
  instrumentType: InstrumentType
  symbol: string
  action: OrderAction
  quantity: DecimalValue | null
  remaining_quantity: DecimalValue | null
  remainingQuantity: DecimalValue | null
  fills: FillInfo[] | null

  constructor(input: LegInput) {
    const data = parseTastyObject(input as JsonMap)
    this.instrument_type = (getAliasValue(data, 'instrument_type') as InstrumentType | undefined) ?? input.instrument_type ?? input.instrumentType ?? InstrumentType.UNKNOWN
    this.instrumentType = this.instrument_type
    this.symbol = input.symbol
    this.action = input.action
    this.quantity = DecimalValue.from((getAliasValue(data, 'quantity') ?? input.quantity) as DecimalInput | null | undefined)
    this.remaining_quantity = DecimalValue.from(
      (getAliasValue(data, 'remaining_quantity') ?? input.remaining_quantity ?? input.remainingQuantity) as
        | DecimalInput
        | null
        | undefined
    )
    this.remainingQuantity = this.remaining_quantity
    this.fills = input.fills ? input.fills.map((fill) => (fill instanceof FillInfo ? fill : new FillInfo(fill))) : null
  }

  toJSON(): JsonMap {
    return {
      instrument_type: this.instrument_type,
      symbol: this.symbol,
      action: this.action,
      quantity: this.quantity,
      remaining_quantity: this.remaining_quantity,
      fills: this.fills
    }
  }
}

export interface Tradeable {
  instrument_type: InstrumentType
  symbol: string
}

export function buildLeg(instrument: Tradeable, quantity: DecimalInput | null, action: OrderAction): Leg {
  return new Leg({
    instrument_type: instrument.instrument_type,
    symbol: instrument.symbol,
    quantity,
    action
  })
}

export interface TradeableTastytradeDataInput {
  instrument_type?: InstrumentType
  symbol?: string
  [key: string]: unknown
}

export class TradeableTastytradeData extends TastytradeData {
  instrument_type: InstrumentType
  symbol: string

  constructor(
    input: TradeableTastytradeDataInput = {},
    defaultInstrumentType = InstrumentType.UNKNOWN,
    options: TastytradeDataOptions = {}
  ) {
    super(input, options)
    this.instrument_type =
      (this.data.instrument_type as InstrumentType | undefined) ?? input.instrument_type ?? defaultInstrumentType
    this.symbol = String(this.data.symbol ?? input.symbol ?? '')
  }

  buildLeg(quantity: DecimalInput | null, action: OrderAction): Leg {
    return buildLeg(this, quantity, action)
  }

  build_leg(quantity: DecimalInput | null, action: OrderAction): Leg {
    return this.buildLeg(quantity, action)
  }
}

export interface MessageInput {
  code?: string
  message?: string
  preflight_id?: string | null
  preflightId?: string | null
  [key: string]: unknown
}

export class Message {
  [key: string]: unknown
  readonly data: JsonMap
  code: string
  message: string
  preflight_id: string | null
  preflightId: string | null

  constructor(data: MessageInput | JsonMap) {
    this.data = parseTastyObject(data as JsonMap)
    assignData(this, this.data)
    this.code = String(getAliasValue(this.data, 'code') ?? '')
    this.message = String(getAliasValue(this.data, 'message') ?? '')
    this.preflight_id = (getAliasValue(this.data, 'preflight_id') as string | null | undefined) ?? null
    this.preflightId = this.preflight_id
  }

  toString(): string {
    return `${this.code}: ${this.message}`
  }

  toJSON(): JsonMap {
    return {
      code: this.code,
      message: this.message,
      preflight_id: this.preflight_id
    }
  }
}

export class OrderConditionPriceComponent {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
  }

  toJSON(): JsonMap {
    return this.data
  }
}

export class OrderCondition {
  [key: string]: unknown
  readonly data: JsonMap
  price_components: OrderConditionPriceComponent[]
  priceComponents: OrderConditionPriceComponent[]

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
    this.price_components = Array.isArray(this.data.price_components)
      ? (this.data.price_components as JsonMap[]).map((item) => new OrderConditionPriceComponent(item))
      : []
    this.priceComponents = this.price_components
  }

  toJSON(): JsonMap {
    return {
      ...this.data,
      price_components: this.price_components
    }
  }
}

export class OrderRule {
  [key: string]: unknown
  readonly data: JsonMap
  order_conditions: OrderCondition[]
  orderConditions: OrderCondition[]

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
    this.order_conditions = Array.isArray(this.data.order_conditions)
      ? (this.data.order_conditions as JsonMap[]).map((item) => new OrderCondition(item))
      : []
    this.orderConditions = this.order_conditions
  }

  toJSON(): JsonMap {
    return {
      ...this.data,
      order_conditions: this.order_conditions
    }
  }
}

export interface AdvancedInstructionsInput {
  strict_position_effect_validation?: boolean
  strictPositionEffectValidation?: boolean
  [key: string]: unknown
}

export class AdvancedInstructions {
  [key: string]: unknown
  readonly data: JsonMap
  strict_position_effect_validation: boolean
  strictPositionEffectValidation: boolean

  constructor(input: AdvancedInstructionsInput | JsonMap = {}) {
    this.data = parseTastyObject(input as JsonMap)
    assignData(this, this.data)
    this.strict_position_effect_validation =
      (getAliasValue(this.data, 'strict_position_effect_validation') as boolean | undefined) ?? false
    this.strictPositionEffectValidation = this.strict_position_effect_validation
  }

  toJSON(): JsonMap {
    return {
      strict_position_effect_validation: this.strict_position_effect_validation
    }
  }
}

export interface NewOrderInput {
  time_in_force?: OrderTimeInForce
  timeInForce?: OrderTimeInForce
  order_type?: OrderType
  orderType?: OrderType
  legs: Leg[] | LegInput[]
  source?: string
  gtc_date?: string | Date | null
  gtcDate?: string | Date | null
  stop_trigger?: DecimalInput | null
  stopTrigger?: DecimalInput | null
  price?: DecimalInput | null
  value?: DecimalInput | null
  partition_key?: string | null
  partitionKey?: string | null
  preflight_id?: string | null
  preflightId?: string | null
  rules?: OrderRule | JsonMap | null
  advanced_instructions?: AdvancedInstructions | AdvancedInstructionsInput | JsonMap | null
  advancedInstructions?: AdvancedInstructions | AdvancedInstructionsInput | JsonMap | null
  external_identifier?: string | null
  externalIdentifier?: string | null
  [key: string]: unknown
}

export class NewOrder {
  readonly extra: JsonMap
  time_in_force: OrderTimeInForce
  timeInForce: OrderTimeInForce
  order_type: OrderType
  orderType: OrderType
  source: string
  legs: Leg[]
  gtc_date: string | Date | null
  gtcDate: string | Date | null
  stop_trigger: DecimalValue | null
  stopTrigger: DecimalValue | null
  price: DecimalValue | null
  value: DecimalValue | null
  partition_key: string | null
  partitionKey: string | null
  preflight_id: string | null
  preflightId: string | null
  rules: OrderRule | JsonMap | null
  advanced_instructions: AdvancedInstructions | null
  advancedInstructions: AdvancedInstructions | null
  external_identifier: string | null
  externalIdentifier: string | null

  constructor(input: NewOrderInput) {
    const {
      time_in_force,
      timeInForce,
      order_type,
      orderType,
      legs,
      source = versionStr,
      gtc_date = null,
      gtcDate,
      stop_trigger = null,
      stopTrigger,
      price = null,
      value = null,
      partition_key = null,
      partitionKey,
      preflight_id = null,
      preflightId,
      rules = null,
      advanced_instructions = null,
      advancedInstructions,
      external_identifier = null,
      externalIdentifier,
      ...extra
    } = input
    this.time_in_force = time_in_force ?? timeInForce ?? required<OrderTimeInForce>('time_in_force')
    this.timeInForce = this.time_in_force
    this.order_type = order_type ?? orderType ?? required<OrderType>('order_type')
    this.orderType = this.order_type
    this.source = source
    this.legs = legs.map((leg) => (leg instanceof Leg ? leg : new Leg(leg)))
    this.gtc_date = gtcDate ?? gtc_date
    this.gtcDate = this.gtc_date
    this.stop_trigger = DecimalValue.from(stopTrigger ?? stop_trigger)
    this.stopTrigger = this.stop_trigger
    this.price = DecimalValue.from(price)
    this.value = DecimalValue.from(value)
    this.partition_key = partitionKey ?? partition_key
    this.partitionKey = this.partition_key
    this.preflight_id = preflightId ?? preflight_id
    this.preflightId = this.preflight_id
    this.rules = rules instanceof OrderRule || rules === null ? rules : new OrderRule(rules)
    const advanced = advancedInstructions ?? advanced_instructions
    this.advanced_instructions =
      advanced instanceof AdvancedInstructions || advanced === null ? advanced : new AdvancedInstructions(advanced)
    this.advancedInstructions = this.advanced_instructions
    this.external_identifier = externalIdentifier ?? external_identifier
    this.externalIdentifier = this.external_identifier
    this.extra = extra
  }

  get price_effect(): PriceEffect | null {
    return getSign(this.price)
  }

  get value_effect(): PriceEffect | null {
    return getSign(this.value)
  }

  toJSON(): JsonMap {
    return {
      time_in_force: this.time_in_force,
      order_type: this.order_type,
      source: this.source,
      legs: this.legs,
      gtc_date: this.gtc_date,
      stop_trigger: this.stop_trigger,
      price: this.price?.abs() ?? null,
      value: this.value?.abs() ?? null,
      price_effect: this.price_effect,
      value_effect: this.value_effect,
      partition_key: this.partition_key,
      preflight_id: this.preflight_id,
      rules: this.rules,
      advanced_instructions: this.advanced_instructions,
      external_identifier: this.external_identifier,
      ...this.extra
    }
  }

  toApiJSON(options: { exclude?: Iterable<string> } = {}): string {
    const data = toApiObject(this, { byAlias: true, excludeNone: true })
    if (isJsonMap(data) && options.exclude) {
      for (const key of options.exclude) {
        delete data[dasherize(key)]
        delete data[key]
      }
    }
    return JSON.stringify(data)
  }
}

export interface NewComplexOrderInput {
  orders: NewOrder[] | NewOrderInput[]
  source?: string
  trigger_order?: NewOrder | NewOrderInput | null
  triggerOrder?: NewOrder | NewOrderInput | null
  type?: ComplexOrderType
}

export class NewComplexOrder {
  orders: NewOrder[]
  source: string
  trigger_order: NewOrder | null
  triggerOrder: NewOrder | null
  type: ComplexOrderType

  constructor(input: NewComplexOrderInput) {
    this.orders = input.orders.map((order) => (order instanceof NewOrder ? order : new NewOrder(order)))
    this.source = input.source ?? versionStr
    const trigger = input.triggerOrder ?? input.trigger_order
    this.trigger_order = trigger
      ? trigger instanceof NewOrder
        ? trigger
        : new NewOrder(trigger)
      : null
    this.triggerOrder = this.trigger_order
    this.type = this.trigger_order ? ComplexOrderType.OTOCO : input.type ?? ComplexOrderType.OCO
  }

  toJSON(): JsonMap {
    return {
      orders: this.orders,
      source: this.source,
      trigger_order: this.trigger_order,
      type: this.type
    }
  }

  toApiJSON(): string {
    return JSON.stringify(toApiObject(this, { byAlias: true, excludeNone: true }))
  }
}

export class PlacedOrder {
  [key: string]: unknown
  readonly data: JsonMap
  legs: Leg[]
  order_rule: OrderRule | null
  orderRule: OrderRule | null

  constructor(data: JsonMap) {
    this.data = parseTastyObject(setSignFor(data, ['price', 'value']))
    assignData(this, this.data)
    this.legs = Array.isArray(this.data.legs) ? (this.data.legs as LegInput[]).map((leg) => new Leg(leg)) : []
    this.order_rule = isJsonMap(this.data.order_rule) ? new OrderRule(this.data.order_rule) : null
    this.orderRule = this.order_rule
  }
}

export class PlacedComplexOrder {
  [key: string]: unknown
  readonly data: JsonMap
  orders: PlacedOrder[]
  trigger_order: PlacedOrder | null
  triggerOrder: PlacedOrder | null

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
    this.orders = Array.isArray(this.data.orders)
      ? (this.data.orders as JsonMap[]).map((order) => new PlacedOrder(order))
      : []
    this.trigger_order = isJsonMap(this.data.trigger_order) ? new PlacedOrder(this.data.trigger_order) : null
    this.triggerOrder = this.trigger_order
  }
}

export class BuyingPowerEffect {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseTastyObject(
      setSignFor(data, [
        'change_in_margin_requirement',
        'change_in_buying_power',
        'current_buying_power',
        'new_buying_power',
        'isolated_order_margin_requirement'
      ])
    )
    assignData(this, this.data)
  }
}

export class FeeCalculation {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseTastyObject(
      setSignFor(data, [
        'regulatory_fees',
        'clearing_fees',
        'commission',
        'proprietary_index_option_fees',
        'total_fees'
      ])
    )
    assignData(this, this.data)
  }
}

export class PlacedOrderResponse {
  [key: string]: unknown
  readonly data: JsonMap
  buying_power_effect: BuyingPowerEffect
  buyingPowerEffect: BuyingPowerEffect
  order: PlacedOrder
  fee_calculation: FeeCalculation | null
  feeCalculation: FeeCalculation | null
  warnings: Message[] | null
  errors: Message[] | null

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
    this.buying_power_effect = new BuyingPowerEffect(jsonField(this.data, 'buying_power_effect'))
    this.buyingPowerEffect = this.buying_power_effect
    this.order = new PlacedOrder(jsonField(this.data, 'order'))
    this.fee_calculation = isJsonMap(this.data.fee_calculation)
      ? new FeeCalculation(this.data.fee_calculation)
      : null
    this.feeCalculation = this.fee_calculation
    this.warnings = messageList(this.data.warnings)
    this.errors = messageList(this.data.errors)
  }
}

export class PlacedComplexOrderResponse {
  [key: string]: unknown
  readonly data: JsonMap
  buying_power_effect: BuyingPowerEffect
  buyingPowerEffect: BuyingPowerEffect
  complex_order: PlacedComplexOrder
  complexOrder: PlacedComplexOrder
  fee_calculation: FeeCalculation | null
  feeCalculation: FeeCalculation | null
  warnings: Message[] | null
  errors: Message[] | null

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    assignData(this, this.data)
    this.buying_power_effect = new BuyingPowerEffect(jsonField(this.data, 'buying_power_effect'))
    this.buyingPowerEffect = this.buying_power_effect
    this.complex_order = new PlacedComplexOrder(jsonField(this.data, 'complex_order'))
    this.complexOrder = this.complex_order
    this.fee_calculation = isJsonMap(this.data.fee_calculation)
      ? new FeeCalculation(this.data.fee_calculation)
      : null
    this.feeCalculation = this.fee_calculation
    this.warnings = messageList(this.data.warnings)
    this.errors = messageList(this.data.errors)
  }
}

function isJsonMap(value: unknown): value is JsonMap {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function jsonField(data: JsonMap, key: string): JsonMap {
  const value = data[key]
  return isJsonMap(value) ? value : {}
}

function messageList(value: unknown): Message[] | null {
  if (value === null || value === undefined) return null
  if (!Array.isArray(value)) return null
  return value.map((message) => new Message(isJsonMap(message) ? message : {}))
}

function assignData(target: Record<string, unknown>, data: JsonMap): void {
  Object.assign(target, data)
  for (const [key, value] of Object.entries(data)) {
    if (key.includes('_')) {
      target[camelize(key)] = value
    }
  }
}

function required<T>(field: string): T {
  throw new TypeError(`Missing required field: ${field}`)
}
