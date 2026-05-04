import { DecimalValue } from './decimal.js'
import { type ReadOnlySessionLike as Session } from './session.js'
import { parseTastyObject, validateAndParse, type JsonMap } from './utils.js'

type DateInput = Date | string

class Model {
  [key: string]: unknown
  data: JsonMap

  constructor(input: JsonMap = {}, decimalFields: string[] = []) {
    this.data = parseTastyObject(input, { decimalFields })
    Object.assign(this, this.data)
  }
}

export class DividendInfo extends Model {
  declare occurred_date?: DateInput
  declare amount?: DecimalValue | null

  constructor(input: JsonMap = {}) {
    super(input, ['amount'])
  }
}

export class EarningsInfo extends Model {
  declare occurred_date?: DateInput
  declare eps?: DecimalValue | null

  constructor(input: JsonMap = {}) {
    super(input, ['eps'])
  }
}

export class EarningsReport extends Model {
  declare estimated?: boolean
  declare late_flag?: number
  declare visible?: boolean
  declare actual_eps?: DecimalValue | null
  declare consensus_estimate?: DecimalValue | null
  declare expected_report_date?: DateInput | null
  declare quarter_end_date?: DateInput | null
  declare time_of_day?: string | null
  declare updated_at?: DateInput | null

  constructor(input: JsonMap = {}) {
    super(input, ['actual_eps', 'consensus_estimate'])
  }
}

export class Liquidity extends Model {
  declare sum?: DecimalValue | null
  declare count?: number
  declare started_at?: DateInput
  declare updated_at?: DateInput | null

  constructor(input: JsonMap = {}) {
    super(input, ['sum'])
  }
}

export class OptionExpirationImpliedVolatility extends Model {
  declare expiration_date?: DateInput
  declare settlement_type?: string
  declare option_chain_type?: string
  declare implied_volatility?: DecimalValue | null

  constructor(input: JsonMap = {}) {
    super(input, ['implied_volatility'])
  }
}

export class MarketMetricInfo extends Model {
  declare symbol?: string
  declare implied_volatility_index?: DecimalValue | null
  declare implied_volatility_index_5_day_change?: DecimalValue | null
  declare implied_volatility_index_rank?: string | null
  declare tos_implied_volatility_index_rank?: DecimalValue | null
  declare tw_implied_volatility_index_rank?: DecimalValue | null
  declare tos_implied_volatility_index_rank_updated_at?: DateInput | null
  declare implied_volatility_index_rank_source?: string | null
  declare implied_volatility_percentile?: string | null
  declare implied_volatility_updated_at?: DateInput | null
  declare liquidity_rating?: number | null
  declare updated_at?: DateInput
  declare option_expiration_implied_volatilities?: OptionExpirationImpliedVolatility[] | null
  declare beta?: DecimalValue | null
  declare corr_spy_3month?: DecimalValue | null
  declare market_cap?: DecimalValue | null
  declare earnings?: EarningsReport | null
  declare price_earnings_ratio?: DecimalValue | null
  declare earnings_per_share?: DecimalValue | null
  declare dividend_rate_per_share?: DecimalValue | null
  declare implied_volatility_30_day?: DecimalValue | null
  declare historical_volatility_30_day?: DecimalValue | null
  declare historical_volatility_60_day?: DecimalValue | null
  declare historical_volatility_90_day?: DecimalValue | null
  declare iv_hv_30_day_difference?: DecimalValue | null
  declare beta_updated_at?: DateInput | null
  declare created_at?: DateInput | null
  declare dividend_ex_date?: DateInput | null
  declare dividend_next_date?: DateInput | null
  declare dividend_pay_date?: DateInput | null
  declare dividend_updated_at?: DateInput | null
  declare liquidity_value?: DecimalValue | null
  declare liquidity_rank?: DecimalValue | null
  declare liquidity_running_state?: Liquidity | null
  declare dividend_yield?: DecimalValue | null
  declare listed_market?: string | null
  declare lendability?: string | null
  declare borrow_rate?: DecimalValue | null

  constructor(input: JsonMap = {}) {
    super(input, [
      'implied_volatility_index',
      'implied_volatility_index_5_day_change',
      'tos_implied_volatility_index_rank',
      'tw_implied_volatility_index_rank',
      'beta',
      'corr_spy_3month',
      'market_cap',
      'price_earnings_ratio',
      'earnings_per_share',
      'dividend_rate_per_share',
      'implied_volatility_30_day',
      'historical_volatility_30_day',
      'historical_volatility_60_day',
      'historical_volatility_90_day',
      'iv_hv_30_day_difference',
      'liquidity_value',
      'liquidity_rank',
      'dividend_yield',
      'borrow_rate'
    ])
    if (Array.isArray(this.option_expiration_implied_volatilities)) {
      this.option_expiration_implied_volatilities = this.option_expiration_implied_volatilities.map(
        (item) => new OptionExpirationImpliedVolatility(item as JsonMap)
      )
    }
    if (this.earnings && typeof this.earnings === 'object') {
      this.earnings = new EarningsReport(this.earnings as JsonMap)
    }
    if (this.liquidity_running_state && typeof this.liquidity_running_state === 'object') {
      this.liquidity_running_state = new Liquidity(this.liquidity_running_state as JsonMap)
    }
  }
}

export async function getMarketMetrics(session: Session, symbols: string[]): Promise<MarketMetricInfo[]> {
  const data = await session._get('/market-metrics', { params: { symbols: symbols.join(',') } })
  return items(data).map((item) => new MarketMetricInfo(item))
}

export const get_market_metrics = getMarketMetrics
export const a_get_market_metrics = getMarketMetrics

export async function getDividends(session: Session, symbol: string): Promise<DividendInfo[]> {
  const encodedSymbol = symbol.replaceAll('/', '%2F')
  const data = await session._get(`/market-metrics/historic-corporate-events/dividends/${encodedSymbol}`)
  return items(data).map((item) => new DividendInfo(item))
}

export const get_dividends = getDividends
export const a_get_dividends = getDividends

export async function getEarnings(session: Session, symbol: string, startDate: DateInput): Promise<EarningsInfo[]> {
  const encodedSymbol = symbol.replaceAll('/', '%2F')
  const data = await session._get(`/market-metrics/historic-corporate-events/earnings-reports/${encodedSymbol}`, {
    params: { 'start-date': formatApiDate(startDate) }
  })
  return items(data).map((item) => new EarningsInfo(item))
}

export const get_earnings = getEarnings
export const a_get_earnings = getEarnings

export async function getRiskFreeRate(session: Session): Promise<DecimalValue> {
  const response = await session.fetch(new URL('/margin-requirements-public-configuration', session.base_url).toString(), {
    method: 'GET',
    headers: headersWithoutAuthorization(session.headers)
  })
  const data = await validateAndParse(response)
  return new DecimalValue(data['risk-free-rate'] as string | number)
}

export const get_risk_free_rate = getRiskFreeRate
export const a_get_risk_free_rate = getRiskFreeRate

function headersWithoutAuthorization(headers: Record<string, string>): Record<string, string> {
  const copy = { ...headers }
  for (const key of Object.keys(copy)) {
    if (key.toLowerCase() === 'authorization') delete copy[key]
  }
  return copy
}

function items(data: JsonMap): JsonMap[] {
  return (data.items as JsonMap[] | undefined) ?? []
}

function formatApiDate(value: DateInput): string {
  if (typeof value === 'string') return value
  return value.toISOString().slice(0, 10)
}
