import { Session } from './session.js'
import { parseTastyObject, type JsonMap } from './utils.js'

export enum ExchangeType {
  CME = 'CME',
  CFE = 'CFE',
  NYSE = 'Equity',
  SMALL = 'Smalls'
}

export enum MarketStatus {
  OPEN = 'Open',
  CLOSED = 'Closed',
  PRE_MARKET = 'Pre-market',
  EXTENDED = 'Extended'
}

type DateInput = Date | string

class Model {
  [key: string]: unknown
  data: JsonMap

  constructor(input: JsonMap = {}) {
    this.data = parseTastyObject(input)
    Object.assign(this, this.data)
  }
}

export class MarketSessionSnapshot extends Model {
  declare close_at?: DateInput
  declare close_at_ext?: DateInput | null
  declare instrument_collection?: string
  declare open_at?: DateInput
  declare session_date?: DateInput
  declare start_at?: DateInput
}

export class MarketSession extends Model {
  declare close_at?: DateInput | null
  declare close_at_ext?: DateInput | null
  declare instrument_collection?: string
  declare open_at?: DateInput | null
  declare start_at?: DateInput | null
  declare next_session?: MarketSessionSnapshot | null
  declare previous_session?: MarketSessionSnapshot | null
  declare state?: MarketStatus
  declare status?: MarketStatus

  constructor(input: JsonMap = {}) {
    super(input)
    const status = this.status ?? this.state
    if (status !== undefined) this.status = status
    if (this.next_session && typeof this.next_session === 'object') {
      this.next_session = new MarketSessionSnapshot(this.next_session as JsonMap)
    }
    if (this.previous_session && typeof this.previous_session === 'object') {
      this.previous_session = new MarketSessionSnapshot(this.previous_session as JsonMap)
    }
  }
}

export class MarketCalendar extends Model {
  declare half_days?: DateInput[]
  declare holidays?: DateInput[]
  declare market_half_days?: DateInput[]
  declare market_holidays?: DateInput[]

  constructor(input: JsonMap = {}) {
    super(input)
    this.half_days = this.half_days ?? this.market_half_days ?? []
    this.holidays = this.holidays ?? this.market_holidays ?? []
  }
}

export async function getMarketSessions(
  session: Session,
  exchanges: ExchangeType[]
): Promise<MarketSession[]> {
  const data = await session._get('/market-time/sessions/current', {
    params: { 'instrument-collections[]': exchanges.map((exchange) => String(exchange)) }
  })
  return items(data).map((item) => new MarketSession(item))
}

export const get_market_sessions = getMarketSessions
export const a_get_market_sessions = getMarketSessions

export async function getMarketHolidays(session: Session): Promise<MarketCalendar> {
  return new MarketCalendar(await session._get('/market-time/equities/holidays'))
}

export const get_market_holidays = getMarketHolidays
export const a_get_market_holidays = getMarketHolidays

export async function getFuturesHolidays(session: Session, exchange: ExchangeType): Promise<MarketCalendar> {
  return new MarketCalendar(await session._get(`/market-time/futures/holidays/${exchange}`))
}

export const get_futures_holidays = getFuturesHolidays
export const a_get_futures_holidays = getFuturesHolidays

function items(data: JsonMap): JsonMap[] {
  return (data.items as JsonMap[] | undefined) ?? []
}
