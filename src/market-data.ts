import { DecimalValue } from './decimal.js'
import { InstrumentType } from './order.js'
import { Session } from './session.js'
import { parseTastyObject, type JsonMap } from './utils.js'

export enum MarketDataExchangeType {
  CME = 'CME',
  CFE = 'CFE',
  NYSE = 'Equity',
  SMALL = 'Smalls',
  CBOE = 'CBOED',
  BOND = 'Bond',
  CRYPTO = 'Cryptocurrency',
  EQUITY_OFFERING = 'Equity Offering',
  UNKNOWN = 'Unknown'
}

export { MarketDataExchangeType as ExchangeType }

export enum ClosePriceType {
  FINAL = 'Final',
  INDICATIVE = 'Indicative',
  PRELIMINARY = 'Preliminary',
  REGULAR = 'Regular',
  UNKNOWN = 'Unknown'
}

type DateInput = Date | string

class Model {
  [key: string]: unknown
  data: JsonMap

  constructor(input: JsonMap = {}, decimalFields: string[] = []) {
    this.data = parseTastyObject(input, { decimalFields })
    Object.assign(this, this.data)
  }
}

export class InstrumentKey extends Model {
  declare symbol?: string
  declare instrument_type?: InstrumentType
}

export class Instrument extends Model {
  declare symbol?: string
  declare instrument_type?: InstrumentType
  declare instrument_key?: InstrumentKey
  declare underlying_instrument?: string
  declare root_symbol?: string
  declare exchange?: MarketDataExchangeType

  constructor(input: JsonMap = {}) {
    super(input)
    if (this.instrument_key && typeof this.instrument_key === 'object') {
      this.instrument_key = new InstrumentKey(this.instrument_key as JsonMap)
    }
  }
}

export class MarketData extends Model {
  declare symbol?: string
  declare instrument_type?: InstrumentType
  declare updated_at?: DateInput
  declare bid_size?: DecimalValue | null
  declare ask_size?: DecimalValue | null
  declare mark?: DecimalValue | null
  declare close_price_type?: ClosePriceType
  declare summary_date?: DateInput
  declare prev_close_date?: DateInput
  declare prev_close_price_type?: ClosePriceType
  declare halt_start_time?: number
  declare halt_end_time?: number
  declare ask?: DecimalValue | null
  declare beta?: DecimalValue | null
  declare bid?: DecimalValue | null
  declare close?: DecimalValue | null
  declare day_open?: DecimalValue | null
  declare day_high?: DecimalValue | null
  declare day_low?: DecimalValue | null
  declare day_close?: DecimalValue | null
  declare day_high_price?: DecimalValue | null
  declare day_low_price?: DecimalValue | null
  declare dividend_amount?: DecimalValue | null
  declare dividend_frequency?: DecimalValue | null
  declare high_limit_price?: DecimalValue | null
  declare instrument?: Instrument | null
  declare last?: DecimalValue | null
  declare last_mkt?: DecimalValue | null
  declare last_ext?: DecimalValue | null
  declare last_trade_time?: number | null
  declare low_limit_price?: DecimalValue | null
  declare mid?: DecimalValue | null
  declare open?: DecimalValue | null
  declare prev_close?: DecimalValue | null
  declare prev_day_close?: DecimalValue | null
  declare trading_halted?: boolean | null
  declare trading_halted_reason?: string | null
  declare volume?: DecimalValue | null
  declare year_low_price?: DecimalValue | null
  declare year_high_price?: DecimalValue | null
  declare open_interest?: DecimalValue | null

  constructor(input: JsonMap = {}) {
    super(input, [
      'bid_size',
      'ask_size',
      'mark',
      'ask',
      'beta',
      'bid',
      'close',
      'day_open',
      'day_high',
      'day_low',
      'day_close',
      'day_high_price',
      'day_low_price',
      'dividend_amount',
      'dividend_frequency',
      'high_limit_price',
      'last',
      'last_mkt',
      'last_ext',
      'low_limit_price',
      'mid',
      'open',
      'prev_close',
      'prev_day_close',
      'volume',
      'year_low_price',
      'year_high_price',
      'open_interest'
    ])
    if (this.instrument && typeof this.instrument === 'object') {
      this.instrument = new Instrument(this.instrument as JsonMap)
    }
  }
}

export async function getMarketData(
  session: Session,
  symbol: string,
  instrumentType: InstrumentType
): Promise<MarketData> {
  return new MarketData(await session._get(`/market-data/${instrumentType}/${symbol}`))
}

export const get_market_data = getMarketData
export const a_get_market_data = getMarketData

export async function getMarketDataByType(
  session: Session,
  params: {
    cryptocurrencies?: string[]
    equities?: string[]
    futures?: string[]
    future_options?: string[]
    indices?: string[]
    options?: string[]
  } = {}
): Promise<MarketData[]> {
  const data = await session._get('/market-data/by-type', {
    params: compactParams({
      index: params.indices,
      equity: params.equities,
      'equity-option': params.options,
      future: params.futures,
      'future-option': params.future_options,
      cryptocurrency: params.cryptocurrencies
    })
  })
  return items(data).map((item) => new MarketData(item))
}

export const get_market_data_by_type = getMarketDataByType
export const a_get_market_data_by_type = getMarketDataByType

function compactParams(params: Record<string, string[] | undefined>): Record<string, string[]> {
  const compacted: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value.length > 0) compacted[key] = value
  }
  return compacted
}

function items(data: JsonMap): JsonMap[] {
  return (data.items as JsonMap[] | undefined) ?? []
}
