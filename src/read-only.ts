import {
  getMarketData as internalGetMarketData,
  getMarketDataByType as internalGetMarketDataByType,
  type MarketData as MarketDataModel
} from './market-data.js'
import {
  getFutureOptionChain as internalGetFutureOptionChain,
  getOptionChain as internalGetOptionChain,
  getQuantityDecimalPrecisions as internalGetQuantityDecimalPrecisions,
  type FutureOption,
  type Option,
  type QuantityDecimalPrecision
} from './instruments.js'
import {
  getFuturesHolidays as internalGetFuturesHolidays,
  getMarketHolidays as internalGetMarketHolidays,
  getMarketSessions as internalGetMarketSessions,
  type ExchangeType,
  type MarketCalendar,
  type MarketSession
} from './market-sessions.js'
import {
  getDividends as internalGetDividends,
  getEarnings as internalGetEarnings,
  getMarketMetrics as internalGetMarketMetrics,
  getRiskFreeRate as internalGetRiskFreeRate,
  type DividendInfo,
  type EarningsInfo,
  type MarketMetricInfo
} from './metrics.js'
import { symbolSearch as internalSymbolSearch, type SymbolData } from './search.js'
import {
  DXLinkStreamer as InternalDXLinkStreamer,
  type WebSocketFactory
} from './streamer.js'
import {
  ReadOnlySession as InternalReadOnlySession,
  Session,
  type ReadOnlySessionLike as InternalReadOnlySessionLike,
  type SessionOptions
} from './session.js'
import type { DecimalValue } from './decimal.js'
import type { InstrumentType } from './order.js'

export {
  API_URL,
  API_VERSION,
  CERT_URL,
  versionStr
} from './constants.js'
export { DecimalValue, decimal, type DecimalInput } from './decimal.js'
export type { FetchLike, PageParams, SessionOptions } from './session.js'

export interface ReadOnlySessionLike {
  readonly is_test: boolean
  readonly proxy: string | null
  readonly base_url: string
  readonly session_expiration: number
  readonly streamer_expiration: number
  readonly dxlink_url: string
  serialize(): string
  refresh(force?: boolean): Promise<void>
  refreshStreamerToken(): Promise<void>
  refresh_streamer_token(): Promise<void>
  validate(): Promise<boolean>
  a_validate(): Promise<boolean>
  a_refresh(): Promise<void>
}

const internalSessions = new WeakMap<ReadOnlySession, InternalReadOnlySessionLike>()

export class ReadOnlySession implements ReadOnlySessionLike {
  constructor(providerSecret?: string | SessionOptions, refreshToken?: string, isTest?: boolean)
  constructor(providerSecret?: string | SessionOptions | Session, refreshToken?: string, isTest?: boolean) {
    const session =
      providerSecret instanceof Session
        ? InternalReadOnlySession.fromSession(providerSecret)
        : new InternalReadOnlySession(providerSecret as string | SessionOptions | undefined, refreshToken, isTest)
    internalSessions.set(this, session)
  }

  static fromSession(session: unknown): ReadOnlySession {
    if (!(session instanceof Session)) throw new TypeError('Expected Session instance.')
    return new ReadOnlySession(session)
  }

  get is_test(): boolean {
    return unwrap(this).is_test
  }

  get proxy(): string | null {
    return unwrap(this).proxy
  }

  get base_url(): string {
    return unwrap(this).base_url
  }

  get session_expiration(): number {
    return unwrap(this).session_expiration
  }

  get streamer_expiration(): number {
    return unwrap(this).streamer_expiration
  }

  get dxlink_url(): string {
    return unwrap(this).dxlink_url
  }

  serialize(): string {
    return unwrap(this).serialize()
  }

  async refresh(force = false): Promise<void> {
    await unwrap(this).refresh(force)
  }

  async refreshStreamerToken(): Promise<void> {
    await unwrap(this).refreshStreamerToken()
  }

  async refresh_streamer_token(): Promise<void> {
    await unwrap(this).refresh_streamer_token()
  }

  async validate(): Promise<boolean> {
    return unwrap(this).validate()
  }

  async a_validate(): Promise<boolean> {
    return unwrap(this).a_validate()
  }

  async a_refresh(): Promise<void> {
    await unwrap(this).a_refresh()
  }
}

export async function getMarketData(
  session: ReadOnlySession,
  symbol: string,
  instrumentType: InstrumentType
): Promise<MarketDataModel> {
  return internalGetMarketData(unwrap(session), symbol, instrumentType)
}

export const get_market_data = getMarketData
export const a_get_market_data = getMarketData

export async function getMarketDataByType(
  session: ReadOnlySession,
  params: Parameters<typeof internalGetMarketDataByType>[1] = {}
): Promise<MarketDataModel[]> {
  return internalGetMarketDataByType(unwrap(session), params)
}

export const get_market_data_by_type = getMarketDataByType
export const a_get_market_data_by_type = getMarketDataByType

export async function getQuantityDecimalPrecisions(session: ReadOnlySession): Promise<QuantityDecimalPrecision[]> {
  return internalGetQuantityDecimalPrecisions(unwrap(session))
}

export const get_quantity_decimal_precisions = getQuantityDecimalPrecisions
export const a_get_quantity_decimal_precisions = getQuantityDecimalPrecisions

export async function getOptionChain(session: ReadOnlySession, symbol: string): Promise<Record<string, Option[]>> {
  return internalGetOptionChain(unwrap(session), symbol)
}

export const get_option_chain = getOptionChain
export const a_get_option_chain = getOptionChain

export async function getFutureOptionChain(session: ReadOnlySession, symbol: string): Promise<Record<string, FutureOption[]>> {
  return internalGetFutureOptionChain(unwrap(session), symbol)
}

export const get_future_option_chain = getFutureOptionChain
export const a_get_future_option_chain = getFutureOptionChain

export async function getMarketSessions(session: ReadOnlySession, exchanges: ExchangeType[]): Promise<MarketSession[]> {
  return internalGetMarketSessions(unwrap(session), exchanges)
}

export const get_market_sessions = getMarketSessions
export const a_get_market_sessions = getMarketSessions

export async function getMarketHolidays(session: ReadOnlySession): Promise<MarketCalendar> {
  return internalGetMarketHolidays(unwrap(session))
}

export const get_market_holidays = getMarketHolidays
export const a_get_market_holidays = getMarketHolidays

export async function getFuturesHolidays(session: ReadOnlySession, exchange: ExchangeType): Promise<MarketCalendar> {
  return internalGetFuturesHolidays(unwrap(session), exchange)
}

export const get_futures_holidays = getFuturesHolidays
export const a_get_futures_holidays = getFuturesHolidays

export async function getMarketMetrics(session: ReadOnlySession, symbols: string[]): Promise<MarketMetricInfo[]> {
  return internalGetMarketMetrics(unwrap(session), symbols)
}

export const get_market_metrics = getMarketMetrics
export const a_get_market_metrics = getMarketMetrics

export async function getDividends(session: ReadOnlySession, symbol: string): Promise<DividendInfo[]> {
  return internalGetDividends(unwrap(session), symbol)
}

export const get_dividends = getDividends
export const a_get_dividends = getDividends

export async function getEarnings(
  session: ReadOnlySession,
  symbol: string,
  startDate: Parameters<typeof internalGetEarnings>[2]
): Promise<EarningsInfo[]> {
  return internalGetEarnings(unwrap(session), symbol, startDate)
}

export const get_earnings = getEarnings
export const a_get_earnings = getEarnings

export async function getRiskFreeRate(session: ReadOnlySession): Promise<DecimalValue> {
  return internalGetRiskFreeRate(unwrap(session))
}

export const get_risk_free_rate = getRiskFreeRate
export const a_get_risk_free_rate = getRiskFreeRate

export async function symbolSearch(session: ReadOnlySession, text: string): Promise<SymbolData[]> {
  return internalSymbolSearch(unwrap(session), text)
}

export const symbol_search = symbolSearch
export const a_symbol_search = symbolSearch

export class DXLinkStreamer {
  readonly session: ReadOnlySession
  readonly #streamer: InternalDXLinkStreamer

  constructor(session: ReadOnlySession, webSocketFactory?: WebSocketFactory) {
    this.session = session
    this.#streamer = new InternalDXLinkStreamer(unwrap(session), webSocketFactory)
  }

  connect(): Promise<void> {
    return this.#streamer.connect()
  }

  close(): Promise<void> {
    return this.#streamer.close()
  }

  subscribe(...args: Parameters<InternalDXLinkStreamer['subscribe']>): Promise<void> {
    return this.#streamer.subscribe(...args)
  }

  unsubscribe(...args: Parameters<InternalDXLinkStreamer['unsubscribe']>): Promise<void> {
    return this.#streamer.unsubscribe(...args)
  }

  unsubscribeAll(...args: Parameters<InternalDXLinkStreamer['unsubscribeAll']>): Promise<void> {
    return this.#streamer.unsubscribeAll(...args)
  }

  unsubscribe_all(...args: Parameters<InternalDXLinkStreamer['unsubscribe_all']>): Promise<void> {
    return this.#streamer.unsubscribe_all(...args)
  }

  subscribeCandle(...args: Parameters<InternalDXLinkStreamer['subscribeCandle']>): Promise<void> {
    return this.#streamer.subscribeCandle(...args)
  }

  subscribe_candle(...args: Parameters<InternalDXLinkStreamer['subscribe_candle']>): Promise<void> {
    return this.#streamer.subscribe_candle(...args)
  }

  unsubscribeCandle(...args: Parameters<InternalDXLinkStreamer['unsubscribeCandle']>): Promise<void> {
    return this.#streamer.unsubscribeCandle(...args)
  }

  unsubscribe_candle(...args: Parameters<InternalDXLinkStreamer['unsubscribe_candle']>): Promise<void> {
    return this.#streamer.unsubscribe_candle(...args)
  }

  listen(...args: Parameters<InternalDXLinkStreamer['listen']>): ReturnType<InternalDXLinkStreamer['listen']> {
    return this.#streamer.listen(...args)
  }

  getEvent(...args: Parameters<InternalDXLinkStreamer['getEvent']>): ReturnType<InternalDXLinkStreamer['getEvent']> {
    return this.#streamer.getEvent(...args)
  }

  get_event(...args: Parameters<InternalDXLinkStreamer['get_event']>): ReturnType<InternalDXLinkStreamer['get_event']> {
    return this.#streamer.get_event(...args)
  }

  getEventNowait(
    ...args: Parameters<InternalDXLinkStreamer['getEventNowait']>
  ): ReturnType<InternalDXLinkStreamer['getEventNowait']> {
    return this.#streamer.getEventNowait(...args)
  }

  get_event_nowait(
    ...args: Parameters<InternalDXLinkStreamer['get_event_nowait']>
  ): ReturnType<InternalDXLinkStreamer['get_event_nowait']> {
    return this.#streamer.get_event_nowait(...args)
  }
}

function unwrap(session: ReadOnlySession): InternalReadOnlySessionLike {
  const internal = internalSessions.get(session)
  if (!internal) throw new TypeError('Expected ReadOnlySession from the read-only entrypoint.')
  return internal
}

export {
  ClosePriceType,
  Instrument,
  InstrumentKey,
  MarketData,
  MarketDataExchangeType,
  ExchangeType as MarketDataExchangeTypeAlias
} from './market-data.js'
export {
  Cryptocurrency,
  Deliverable,
  DestinationVenueSymbol,
  Equity,
  Future,
  FutureEtfEquivalent,
  FutureMonthCode,
  FutureOption,
  FutureOptionProduct,
  FutureProduct,
  NestedFutureOptionChain,
  NestedFutureOptionChainExpiration,
  NestedFutureOptionFuture,
  NestedFutureOptionSubchain,
  NestedOptionChain,
  NestedOptionChainExpiration,
  Option,
  OptionType,
  QuantityDecimalPrecision,
  Roll,
  Strike,
  TickSize,
  Warrant,
  type EquityActiveParams,
  type EquityGetParams,
  type FutureGetParams,
  type FutureOptionGetParams,
  type OptionGetParams,
  type TradeableInstrumentInput
} from './instruments.js'
export {
  ExchangeType,
  MarketCalendar,
  MarketSession,
  MarketSessionSnapshot,
  MarketStatus
} from './market-sessions.js'
export {
  get_future_fx_monthly,
  get_future_grain_monthly,
  get_future_index_monthly,
  get_future_metal_monthly,
  get_future_oil_monthly,
  get_future_treasury_monthly,
  get_tasty_monthly,
  get_third_friday,
  getFutureFxMonthly,
  getFutureGrainMonthly,
  getFutureIndexMonthly,
  getFutureMetalMonthly,
  getFutureOilMonthly,
  getFutureTreasuryMonthly,
  getTastyMonthly,
  getThirdFriday,
  is_market_open_now,
  is_market_open_on,
  isMarketOpenNow,
  isMarketOpenOn,
  NEW_YORK_TIME_ZONE,
  now_in_new_york,
  nowInNewYork,
  today_in_new_york,
  todayInNewYork,
  ymd
} from './calendar.js'
export {
  DividendInfo,
  EarningsInfo,
  EarningsReport,
  Liquidity,
  MarketMetricInfo,
  OptionExpirationImpliedVolatility
} from './metrics.js'
export { SymbolData } from './search.js'
export {
  DXLINK_VERSION,
  type WebSocketFactory,
  type WebSocketLike
} from './streamer.js'
export {
  Candle,
  Event,
  Greeks,
  IndexedEvent,
  Profile,
  Quote,
  Summary,
  TheoPrice,
  TimeAndSale,
  Trade,
  Underlying,
  type FieldDef
} from './dxfeed/index.js'
export { InstrumentType } from './order.js'
