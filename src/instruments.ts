import { DecimalValue, type DecimalInput } from './decimal.js'
import { InstrumentType, TradeableTastytradeData } from './order.js'
import { type Session } from './session.js'
import { TastytradeData, type JsonMap } from './utils.js'

export enum OptionType {
  CALL = 'C',
  PUT = 'P'
}

export enum FutureMonthCode {
  JAN = 'F',
  JANUARY = 'F',
  FEB = 'G',
  FEBRUARY = 'G',
  MAR = 'H',
  MARCH = 'H',
  APR = 'J',
  APRIL = 'J',
  MAY = 'K',
  JUN = 'M',
  JUNE = 'M',
  JUL = 'N',
  JULY = 'N',
  AUG = 'Q',
  AUGUST = 'Q',
  SEP = 'U',
  SEPTEMBER = 'U',
  OCT = 'V',
  OCTOBER = 'V',
  NOV = 'X',
  NOVEMBER = 'X',
  DEC = 'Z',
  DECEMBER = 'Z'
}

type DateInput = Date | string

export interface TradeableInstrumentInput {
  instrument_type?: InstrumentType
  symbol?: string
  [key: string]: unknown
}

export class Deliverable extends TastytradeData {
  declare id?: number
  declare root_symbol?: string
  declare deliverable_type?: string
  declare description?: string
  declare amount?: DecimalValue | null
  declare percent?: string
  declare symbol?: string | null
  declare instrument_type?: InstrumentType | null

  constructor(input: JsonMap = {}) {
    super(input, { decimalFields: ['amount'] })
  }
}

export class DestinationVenueSymbol extends TastytradeData {
  declare id?: number
  declare symbol?: string
  declare destination_venue?: string
  declare routable?: boolean
  declare max_quantity_precision?: number | null
  declare max_price_precision?: number | null
}

export class QuantityDecimalPrecision extends TastytradeData {
  declare instrument_type?: InstrumentType
  declare value?: number
  declare minimum_increment_precision?: number
  declare symbol?: string | null
}

export class Strike extends TastytradeData {
  declare strike_price?: DecimalValue | null
  declare call?: string
  declare put?: string
  declare call_streamer_symbol?: string
  declare put_streamer_symbol?: string

  constructor(input: JsonMap = {}) {
    super(input, { decimalFields: ['strike_price'] })
  }
}

export class TickSize extends TastytradeData {
  declare value?: DecimalValue | null
  declare threshold?: DecimalValue | null
  declare symbol?: string | null

  constructor(input: JsonMap = {}) {
    super(input, { decimalFields: ['value', 'threshold'] })
  }
}

export class NestedOptionChainExpiration extends TastytradeData {
  declare expiration_type?: string
  declare expiration_date?: DateInput
  declare days_to_expiration?: number
  declare settlement_type?: string
  declare strikes?: Strike[]

  constructor(input: JsonMap = {}) {
    super(input)
    this.strikes = modelArray(this.strikes, Strike)
  }
}

export class NestedFutureOptionChainExpiration extends TastytradeData {
  declare root_symbol?: string
  declare notional_value?: DecimalValue | null
  declare underlying_symbol?: string
  declare strike_factor?: DecimalValue | null
  declare days_to_expiration?: number
  declare option_root_symbol?: string
  declare expiration_date?: DateInput
  declare expires_at?: DateInput
  declare asset?: string
  declare expiration_type?: string
  declare display_factor?: DecimalValue | null
  declare option_contract_symbol?: string
  declare stops_trading_at?: DateInput
  declare settlement_type?: string
  declare strikes?: Strike[]
  declare tick_sizes?: TickSize[]

  constructor(input: JsonMap = {}) {
    super(input, { decimalFields: ['notional_value', 'strike_factor', 'display_factor'] })
    this.strikes = modelArray(this.strikes, Strike)
    this.tick_sizes = modelArray(this.tick_sizes, TickSize)
  }
}

export class NestedFutureOptionFuture extends TastytradeData {
  declare root_symbol?: string
  declare days_to_expiration?: number
  declare expiration_date?: DateInput
  declare expires_at?: DateInput
  declare next_active_month?: boolean
  declare symbol?: string
  declare active_month?: boolean
  declare stops_trading_at?: DateInput
  declare maturity_date?: DateInput | null

  constructor(input: JsonMap = {}) {
    super(input)
    if (typeof this.maturity_date === 'string') this.maturity_date = dateBeforeUtcOffset(this.maturity_date)
  }
}

export class FutureEtfEquivalent extends TastytradeData {
  declare symbol?: string
  declare share_quantity?: number
}

export class Roll extends TastytradeData {
  declare name?: string
  declare active_count?: number
  declare cash_settled?: boolean
  declare business_days_offset?: number
  declare first_notice?: boolean
}

export class Cryptocurrency extends TradeableTastytradeData {
  declare id?: number
  declare short_description?: string
  declare description?: string
  declare is_closing_only?: boolean
  declare active?: boolean
  declare tick_size?: DecimalValue | null
  declare destination_venue_symbols?: DestinationVenueSymbol[]
  declare streamer_symbol?: string | null

  constructor(input: TradeableInstrumentInput) {
    super(input, InstrumentType.CRYPTOCURRENCY, { decimalFields: ['tick_size'] })
    this.destination_venue_symbols = modelArray(this.destination_venue_symbols, DestinationVenueSymbol)
  }

  static async get(session: Session, symbols: string): Promise<Cryptocurrency>
  static async get(session: Session, symbols?: string[] | null): Promise<Cryptocurrency[]>
  static async get(session: Session, symbols?: string | string[] | null): Promise<Cryptocurrency | Cryptocurrency[]> {
    if (typeof symbols === 'string') {
      return new Cryptocurrency(
        (await session._get(`/instruments/cryptocurrencies/${encodeSlashForPath(symbols)}`)) as TradeableInstrumentInput
      )
    }
    const init = symbols && symbols.length > 0 ? { params: { 'symbol[]': symbols } } : {}
    const data = await session._get('/instruments/cryptocurrencies', init)
    return items(data).map((item) => new Cryptocurrency(item as TradeableInstrumentInput))
  }

  static a_get = Cryptocurrency.get
}

export interface EquityGetParams {
  per_page?: number
  page_offset?: number | null
  lendability?: string | null
  is_index?: boolean | null
  is_etf?: boolean | null
}

export interface EquityActiveParams {
  per_page?: number
  page_offset?: number | null
  lendability?: string | null
}

export class Equity extends TradeableTastytradeData {
  declare id?: number
  declare is_index?: boolean
  declare description?: string
  declare lendability?: string
  declare market_time_instrument_collection?: string
  declare is_closing_only?: boolean
  declare is_options_closing_only?: boolean
  declare active?: boolean
  declare is_illiquid?: boolean
  declare is_etf?: boolean
  declare streamer_symbol?: string
  declare borrow_rate?: DecimalValue | null
  declare cusip?: string | null
  declare short_description?: string | null
  declare halted_at?: DateInput | null
  declare stops_trading_at?: DateInput | null
  declare is_fractional_quantity_eligible?: boolean | null
  declare tick_sizes?: TickSize[] | null
  declare listed_market?: string | null
  declare option_tick_sizes?: TickSize[] | null

  constructor(input: TradeableInstrumentInput) {
    super(input, InstrumentType.EQUITY, { decimalFields: ['borrow_rate'] })
    if (Array.isArray(this.tick_sizes)) this.tick_sizes = modelArray(this.tick_sizes, TickSize)
    if (Array.isArray(this.option_tick_sizes)) this.option_tick_sizes = modelArray(this.option_tick_sizes, TickSize)
  }

  static async getActiveEquities(session: Session, params: EquityActiveParams = {}): Promise<Equity[]> {
    return session._paginate((item) => new Equity(item as TradeableInstrumentInput), '/instruments/equities/active', {
      'per-page': params.per_page ?? 1000,
      'page-offset': pageOffset(params.page_offset),
      lendability: params.lendability
    })
  }

  static async get_active_equities(session: Session, params: EquityActiveParams = {}): Promise<Equity[]> {
    return Equity.getActiveEquities(session, params)
  }

  static a_get_active_equities = Equity.getActiveEquities

  static async get(session: Session, symbols: string): Promise<Equity>
  static async get(session: Session, symbols: string[], params?: EquityGetParams): Promise<Equity[]>
  static async get(session: Session, symbols: string | string[], params: EquityGetParams = {}): Promise<Equity | Equity[]> {
    if (typeof symbols === 'string') {
      return new Equity((await session._get(`/instruments/equities/${encodeSlashForPath(symbols)}`)) as TradeableInstrumentInput)
    }
    return session._paginate((item) => new Equity(item as TradeableInstrumentInput), '/instruments/equities', {
      'symbol[]': symbols,
      lendability: params.lendability,
      'is-index': params.is_index,
      'is-etf': params.is_etf,
      'per-page': params.per_page ?? 250,
      'page-offset': pageOffset(params.page_offset)
    })
  }

  static a_get = Equity.get
}

export interface OptionGetParams {
  active?: boolean | null
  per_page?: number
  page_offset?: number | null
  with_expired?: boolean | null
}

export class Option extends TradeableTastytradeData {
  declare active?: boolean
  declare strike_price?: DecimalValue | null
  declare root_symbol?: string
  declare underlying_symbol?: string
  declare expiration_date?: DateInput
  declare exercise_style?: string
  declare shares_per_contract?: number
  declare option_type?: OptionType
  declare option_chain_type?: string
  declare expiration_type?: string
  declare settlement_type?: string
  declare stops_trading_at?: DateInput
  declare market_time_instrument_collection?: string
  declare days_to_expiration?: number
  declare is_closing_only?: boolean
  declare expires_at?: DateInput | null
  declare streamer_symbol?: string
  declare listed_market?: string | null
  declare halted_at?: DateInput | null
  declare old_security_number?: string | null

  constructor(input: TradeableInstrumentInput) {
    super(input, InstrumentType.EQUITY_OPTION, { decimalFields: ['strike_price'] })
    if (!this.streamer_symbol) this.setStreamerSymbol()
  }

  static async get(session: Session, symbols: string): Promise<Option>
  static async get(session: Session, symbols: string[], params?: OptionGetParams): Promise<Option[]>
  static async get(session: Session, symbols: string | string[], params: OptionGetParams = {}): Promise<Option | Option[]> {
    if (typeof symbols === 'string') {
      return new Option(
        (await session._get(`/instruments/equity-options/${encodeSlashForPath(symbols)}`)) as TradeableInstrumentInput
      )
    }
    return session._paginate((item) => new Option(item as TradeableInstrumentInput), '/instruments/equity-options', {
      'symbol[]': symbols,
      active: params.active,
      'with-expired': params.with_expired,
      'per-page': params.per_page ?? 250,
      'page-offset': pageOffset(params.page_offset)
    })
  }

  static a_get = Option.get

  static streamerSymbolToOcc(streamerSymbol: string): string {
    const match = /^\.([A-Z]+)(\d{6})([CP])(\d+)(\.(\d+))?/.exec(streamerSymbol)
    if (!match) return ''
    const symbol = match[1]!.slice(0, 6).padEnd(6, ' ')
    const exp = match[2]!
    const optionType = match[3]!
    const strike = match[4]!.padStart(5, '0')
    const decimal = match[6] !== undefined ? String(100 * Number(match[6])).padStart(3, '0') : '000'
    return `${symbol}${exp}${optionType}${strike}${decimal}`
  }

  static streamer_symbol_to_occ(streamerSymbol: string): string {
    return Option.streamerSymbolToOcc(streamerSymbol)
  }

  static occToStreamerSymbol(occ: string): string {
    const symbol = occ.slice(0, 6).trim()
    const info = occ.slice(6)
    const match = /^(\d{6})([CP])(\d{5})(\d{3})/.exec(info)
    if (!match) return ''
    const exp = match[1]!
    const optionType = match[2]!
    const strike = Number(match[3]!)
    const decimal = Number(match[4]!)
    let res = `.${symbol}${exp}${optionType}${strike}`
    if (decimal !== 0) {
      res += String(decimal / 1000).slice(1)
    }
    return res
  }

  static occ_to_streamer_symbol(occ: string): string {
    return Option.occToStreamerSymbol(occ)
  }

  private setStreamerSymbol(): void {
    if (!this.underlying_symbol || !this.expiration_date || !this.option_type || !this.strike_price) return
    this.streamer_symbol = `.${this.underlying_symbol}${shortDate(this.expiration_date)}${this.option_type}${formatStrike(
      this.strike_price
    )}`
  }
}

export class NestedOptionChain extends TastytradeData {
  declare underlying_symbol?: string
  declare root_symbol?: string
  declare option_chain_type?: string
  declare shares_per_contract?: number
  declare tick_sizes?: TickSize[]
  declare expirations?: NestedOptionChainExpiration[]
  declare deliverables?: Deliverable[] | null

  constructor(input: JsonMap = {}) {
    super(input)
    this.tick_sizes = modelArray(this.tick_sizes, TickSize)
    this.expirations = modelArray(this.expirations, NestedOptionChainExpiration)
    if (Array.isArray(this.deliverables)) this.deliverables = modelArray(this.deliverables, Deliverable)
  }

  static async get(session: Session, symbol: string): Promise<NestedOptionChain[]> {
    const data = await session._get(`/option-chains/${encodeSlashForPath(symbol)}/nested`)
    return items(data).map((item) => new NestedOptionChain(item))
  }

  static a_get = NestedOptionChain.get
}

export class FutureProduct extends TastytradeData {
  declare root_symbol?: string
  declare code?: string
  declare description?: string
  declare exchange?: string
  declare product_type?: string
  declare listed_months?: FutureMonthCode[]
  declare active_months?: FutureMonthCode[]
  declare notional_multiplier?: DecimalValue | null
  declare tick_size?: DecimalValue | null
  declare display_factor?: DecimalValue | null
  declare streamer_exchange_code?: string
  declare small_notional?: boolean
  declare back_month_first_calendar_symbol?: boolean
  declare first_notice?: boolean
  declare cash_settled?: boolean
  declare market_sector?: string
  declare clearing_code?: string
  declare clearing_exchange_code?: string
  declare roll?: Roll
  declare base_tick?: number | null
  declare sub_tick?: number | null
  declare contract_limit?: number | null
  declare product_subtype?: string | null
  declare security_group?: string | null
  declare true_underlying_code?: string | null
  declare clearport_code?: string | null
  declare legacy_code?: string | null
  declare legacy_exchange_code?: string | null
  declare option_products?: FutureOptionProduct[] | null

  constructor(input: JsonMap = {}) {
    super(input, { decimalFields: ['notional_multiplier', 'tick_size', 'display_factor'] })
    const roll = modelValue(this.roll, Roll)
    if (roll) this.roll = roll
    if (Array.isArray(this.option_products)) this.option_products = modelArray(this.option_products, FutureOptionProduct)
  }

  static async get(session: Session): Promise<FutureProduct[]>
  static async get(session: Session, code: null, exchange?: string): Promise<FutureProduct[]>
  static async get(session: Session, code: string, exchange?: string): Promise<FutureProduct>
  static async get(session: Session, code?: string | null, exchange = 'CME'): Promise<FutureProduct | FutureProduct[]> {
    if (code) {
      return new FutureProduct(await session._get(`/instruments/future-products/${exchange}/${stripSlashes(code)}`))
    }
    const data = await session._get('/instruments/future-products')
    return items(data).map((item) => new FutureProduct(item))
  }

  static a_get = FutureProduct.get
}

export interface FutureGetParams {
  product_codes?: string[] | null
  per_page?: number
  page_offset?: number | null
}

export class Future extends TradeableTastytradeData {
  declare product_code?: string
  declare tick_size?: DecimalValue | null
  declare notional_multiplier?: DecimalValue | null
  declare display_factor?: DecimalValue | null
  declare last_trade_date?: DateInput
  declare expiration_date?: DateInput
  declare active?: boolean
  declare active_month?: boolean
  declare next_active_month?: boolean
  declare is_closing_only?: boolean
  declare stops_trading_at?: DateInput
  declare expires_at?: DateInput
  declare product_group?: string
  declare exchange?: string
  declare streamer_exchange_code?: string
  declare back_month_first_calendar_symbol?: boolean
  declare streamer_symbol?: string
  declare closing_only_date?: DateInput | null
  declare is_tradeable?: boolean | null
  declare future_product?: FutureProduct | null
  declare contract_size?: DecimalValue | null
  declare main_fraction?: DecimalValue | null
  declare sub_fraction?: DecimalValue | null
  declare first_notice_date?: DateInput | null
  declare roll_target_symbol?: string | null
  declare true_underlying_symbol?: string | null
  declare future_etf_equivalent?: FutureEtfEquivalent | null
  declare tick_sizes?: TickSize[] | null
  declare option_tick_sizes?: TickSize[] | null
  declare spread_tick_sizes?: TickSize[] | null

  constructor(input: TradeableInstrumentInput) {
    super(input, InstrumentType.FUTURE, {
      decimalFields: ['tick_size', 'notional_multiplier', 'display_factor', 'contract_size', 'main_fraction', 'sub_fraction']
    })
    const futureProduct = modelValue(this.future_product, FutureProduct)
    if (futureProduct) this.future_product = futureProduct
    const equivalent = modelValue(this.future_etf_equivalent, FutureEtfEquivalent)
    if (equivalent) this.future_etf_equivalent = equivalent
    if (Array.isArray(this.tick_sizes)) this.tick_sizes = modelArray(this.tick_sizes, TickSize)
    if (Array.isArray(this.option_tick_sizes)) this.option_tick_sizes = modelArray(this.option_tick_sizes, TickSize)
    if (Array.isArray(this.spread_tick_sizes)) this.spread_tick_sizes = modelArray(this.spread_tick_sizes, TickSize)
  }

  static async get(session: Session, symbols: string): Promise<Future>
  static async get(session: Session, symbols?: string[] | null, params?: FutureGetParams): Promise<Future[]>
  static async get(session: Session, symbols?: string | string[] | null, params: FutureGetParams = {}): Promise<Future | Future[]> {
    if (typeof symbols === 'string') {
      return new Future((await session._get(`/instruments/futures/${stripSlashes(symbols)}`)) as TradeableInstrumentInput)
    }
    return session._paginate((item) => new Future(item as TradeableInstrumentInput), '/instruments/futures', {
      'symbol[]': symbols,
      'product-code[]': params.product_codes,
      'per-page': params.per_page ?? 250,
      'page-offset': pageOffset(params.page_offset)
    })
  }

  static a_get = Future.get
}

export class FutureOptionProduct extends TastytradeData {
  declare root_symbol?: string
  declare cash_settled?: boolean
  declare code?: string
  declare display_factor?: DecimalValue | null
  declare exchange?: string
  declare product_type?: string
  declare expiration_type?: string
  declare settlement_delay_days?: number
  declare market_sector?: string
  declare clearing_code?: string
  declare clearing_exchange_code?: string
  declare clearing_price_multiplier?: DecimalValue | null
  declare is_rollover?: boolean
  declare future_product?: FutureProduct | null
  declare product_subtype?: string | null
  declare legacy_code?: string | null
  declare clearport_code?: string | null

  constructor(input: JsonMap = {}) {
    super(input, { decimalFields: ['display_factor', 'clearing_price_multiplier'] })
    const futureProduct = modelValue(this.future_product, FutureProduct)
    if (futureProduct) this.future_product = futureProduct
  }

  static async get(session: Session): Promise<FutureOptionProduct[]>
  static async get(session: Session, rootSymbol: null, exchange?: string): Promise<FutureOptionProduct[]>
  static async get(session: Session, rootSymbol: string, exchange?: string): Promise<FutureOptionProduct>
  static async get(
    session: Session,
    rootSymbol?: string | null,
    exchange = 'CME'
  ): Promise<FutureOptionProduct | FutureOptionProduct[]> {
    if (rootSymbol) {
      return new FutureOptionProduct(
        await session._get(`/instruments/future-option-products/${exchange}/${stripSlashes(rootSymbol)}`)
      )
    }
    const data = await session._get('/instruments/future-option-products')
    return items(data).map((item) => new FutureOptionProduct(item))
  }

  static a_get = FutureOptionProduct.get
}

export interface FutureOptionGetParams {
  root_symbol?: string | null
  expiration_date?: DateInput | null
  option_type?: OptionType | string | null
  strike_price?: DecimalInput | null
  per_page?: number
  page_offset?: number | null
}

export class FutureOption extends TradeableTastytradeData {
  declare underlying_symbol?: string
  declare product_code?: string
  declare expiration_date?: DateInput
  declare root_symbol?: string
  declare option_root_symbol?: string
  declare strike_price?: DecimalValue | null
  declare exchange?: string
  declare streamer_symbol?: string
  declare option_type?: OptionType
  declare exercise_style?: string
  declare is_vanilla?: boolean
  declare is_primary_deliverable?: boolean
  declare future_price_ratio?: DecimalValue | null
  declare multiplier?: DecimalValue | null
  declare underlying_count?: DecimalValue | null
  declare is_confirmed?: boolean
  declare notional_value?: DecimalValue | null
  declare display_factor?: DecimalValue | null
  declare settlement_type?: string
  declare strike_factor?: DecimalValue | null
  declare maturity_date?: DateInput
  declare is_exercisable_weekly?: boolean
  declare last_trade_time?: string
  declare days_to_expiration?: number
  declare is_closing_only?: boolean
  declare active?: boolean
  declare stops_trading_at?: DateInput
  declare expires_at?: DateInput
  declare exchange_symbol?: string
  declare security_exchange?: string
  declare sx_id?: string
  declare future_option_product?: FutureOptionProduct | null

  constructor(input: TradeableInstrumentInput) {
    super(input, InstrumentType.FUTURE_OPTION, {
      decimalFields: [
        'strike_price',
        'future_price_ratio',
        'multiplier',
        'underlying_count',
        'notional_value',
        'display_factor',
        'strike_factor'
      ]
    })
    const product = modelValue(this.future_option_product, FutureOptionProduct)
    if (product) this.future_option_product = product
    if (typeof this.maturity_date === 'string') this.maturity_date = dateBeforeUtcOffset(this.maturity_date)
  }

  static async get(session: Session, symbols: string): Promise<FutureOption>
  static async get(session: Session, symbols: string[], params?: FutureOptionGetParams): Promise<FutureOption[]>
  static async get(
    session: Session,
    symbols: string | string[],
    params: FutureOptionGetParams = {}
  ): Promise<FutureOption | FutureOption[]> {
    if (typeof symbols === 'string') {
      return new FutureOption(
        (await session._get(`/instruments/future-options/${encodeFutureOptionSymbol(symbols)}`)) as TradeableInstrumentInput
      )
    }
    return session._paginate((item) => new FutureOption(item as TradeableInstrumentInput), '/instruments/future-options', {
      'symbol[]': symbols,
      'option-root-symbol': params.root_symbol,
      'expiration-date': formatApiDate(params.expiration_date),
      'option-type': params.option_type ? String(params.option_type) : undefined,
      'strike-price': params.strike_price !== null && params.strike_price !== undefined ? String(params.strike_price) : undefined,
      'per-page': params.per_page ?? 250,
      'page-offset': pageOffset(params.page_offset)
    })
  }

  static a_get = FutureOption.get
}

export class NestedFutureOptionSubchain extends TastytradeData {
  declare underlying_symbol?: string
  declare root_symbol?: string
  declare exercise_style?: string
  declare expirations?: NestedFutureOptionChainExpiration[]

  constructor(input: JsonMap = {}) {
    super(input)
    this.expirations = modelArray(this.expirations, NestedFutureOptionChainExpiration)
  }
}

export class NestedFutureOptionChain extends TastytradeData {
  declare futures?: NestedFutureOptionFuture[]
  declare option_chains?: NestedFutureOptionSubchain[]

  constructor(input: JsonMap = {}) {
    super(input)
    this.futures = modelArray(this.futures, NestedFutureOptionFuture)
    this.option_chains = modelArray(this.option_chains, NestedFutureOptionSubchain)
  }

  static async get(session: Session, symbol: string): Promise<NestedFutureOptionChain> {
    return new NestedFutureOptionChain(await session._get(`/futures-option-chains/${stripSlashes(symbol)}/nested`))
  }

  static a_get = NestedFutureOptionChain.get
}

export class Warrant extends TradeableTastytradeData {
  declare listed_market?: string
  declare description?: string
  declare is_closing_only?: boolean
  declare active?: boolean
  declare cusip?: string | null

  constructor(input: TradeableInstrumentInput) {
    super(input, InstrumentType.WARRANT)
  }

  static async get(session: Session, symbols: string): Promise<Warrant>
  static async get(session: Session, symbols?: string[] | null): Promise<Warrant[]>
  static async get(session: Session, symbols?: string | string[] | null): Promise<Warrant | Warrant[]> {
    if (typeof symbols === 'string') {
      return new Warrant((await session._get(`/instruments/warrants/${symbols}`)) as TradeableInstrumentInput)
    }
    const init = symbols && symbols.length > 0 ? { params: { 'symbol[]': symbols } } : {}
    const data = await session._get('/instruments/warrants', init)
    return items(data).map((item) => new Warrant(item as TradeableInstrumentInput))
  }

  static a_get = Warrant.get
}

export async function getQuantityDecimalPrecisions(session: Session): Promise<QuantityDecimalPrecision[]> {
  const data = await session._get('/instruments/quantity-decimal-precisions')
  return items(data).map((item) => new QuantityDecimalPrecision(item))
}

export const get_quantity_decimal_precisions = getQuantityDecimalPrecisions
export const a_get_quantity_decimal_precisions = getQuantityDecimalPrecisions

export async function getOptionChain(session: Session, symbol: string): Promise<Record<string, Option[]>> {
  const data = await session._get(`/option-chains/${encodeSlashForPath(symbol)}`)
  const chain: Record<string, Option[]> = {}
  for (const item of items(data)) {
    const option = new Option(item as TradeableInstrumentInput)
    const key = dateKey(option.expiration_date)
    chain[key] ??= []
    chain[key]!.push(option)
  }
  return chain
}

export const get_option_chain = getOptionChain
export const a_get_option_chain = getOptionChain

export async function getFutureOptionChain(session: Session, symbol: string): Promise<Record<string, FutureOption[]>> {
  const data = await session._get(`/futures-option-chains/${stripSlashes(symbol)}`)
  const chain: Record<string, FutureOption[]> = {}
  for (const item of items(data)) {
    const option = new FutureOption(item as TradeableInstrumentInput)
    const key = dateKey(option.expiration_date)
    chain[key] ??= []
    chain[key]!.push(option)
  }
  return chain
}

export const get_future_option_chain = getFutureOptionChain
export const a_get_future_option_chain = getFutureOptionChain

function items(data: JsonMap): JsonMap[] {
  return (data.items as JsonMap[] | undefined) ?? []
}

function modelArray<T>(value: unknown, Ctor: new (input: JsonMap) => T): T[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => (item instanceof Ctor ? item : new Ctor(item as JsonMap)))
}

function modelValue<T>(value: unknown, Ctor: new (input: JsonMap) => T): T | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value instanceof Ctor ? value : new Ctor(value as JsonMap)
}

function pageOffset(value?: number | null): number | null {
  return value === undefined ? 0 : value
}

function encodeSlashForPath(symbol: string): string {
  return symbol.replaceAll('/', '%2F')
}

function encodeFutureOptionSymbol(symbol: string): string {
  return symbol.replaceAll('/', '%2F').replaceAll(' ', '%20')
}

function stripSlashes(symbol: string): string {
  return symbol.replaceAll('/', '')
}

function formatApiDate(value?: DateInput | null): string | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') return value
  return value.toISOString().slice(0, 10)
}

function shortDate(value: DateInput): string {
  const date = formatApiDate(value)
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '')
  if (!match) return String(value)
  return `${match[1]!.slice(2)}${match[2]}${match[3]}`
}

function formatStrike(value: DecimalInput): string {
  const numberValue = Number(value)
  if (Number.isInteger(numberValue)) return numberValue.toFixed(0)
  const fixed = numberValue.toFixed(2)
  return fixed.endsWith('0') ? fixed.slice(0, -1) : fixed
}

function dateKey(value: DateInput | undefined): string {
  if (!value) return ''
  return formatApiDate(value) ?? String(value)
}

function dateBeforeUtcOffset(value: string): string {
  return value.split(' ')[0] ?? value
}
