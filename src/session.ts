import { API_URL, API_VERSION, CERT_URL, versionStr } from './constants.js'
import { TastytradeError, parseTastyObject, type JsonMap, validateAndParse, validateResponse } from './utils.js'

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export interface SessionOptions {
  providerSecret?: string
  refreshToken?: string
  isTest?: boolean
  proxy?: string | null
  fetch?: FetchLike
  headers?: Record<string, string>
}

export interface PageParams {
  'page-offset': number | null
  'per-page': number
  [key: string]: unknown
}

export interface ReadOnlySessionLike {
  readonly is_test: boolean
  readonly proxy: string | null
  readonly base_url: string
  readonly fetch: FetchLike
  readonly headers: Record<string, string>
  session_expiration: number
  session_token: string
  streamer_expiration: number
  streamer_token: string
  dxlink_url: string
  serialize(): string
  refresh(force?: boolean): Promise<void>
  refreshStreamerToken(): Promise<void>
  refresh_streamer_token(): Promise<void>
  validate(): Promise<boolean>
  a_validate(): Promise<boolean>
  a_refresh(): Promise<void>
  _get(url: string, init?: RequestInit & { params?: Record<string, unknown> }): Promise<JsonMap>
  _a_get(url: string, init?: RequestInit & { params?: Record<string, unknown> }): Promise<JsonMap>
  _paginate<T>(factory: (item: JsonMap) => T, url: string, params: PageParams): Promise<T[]>
}

type DateInput = Date | string

class SessionModel {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(data: JsonMap = {}) {
    this.data = parseTastyObject(data)
    Object.assign(this, this.data)
  }
}

export class Address extends SessionModel {
  declare city?: string
  declare country?: string
  declare is_domestic?: boolean
  declare is_foreign?: boolean
  declare postal_code?: string
  declare state_region?: string
  declare street_one?: string
  declare street_two?: string | null
  declare street_three?: string | null
}

export class EntityOfficer extends SessionModel {
  declare id?: string
  declare external_id?: string
  declare first_name?: string
  declare last_name?: string
  declare middle_name?: string
  declare prefix_name?: string
  declare suffix_name?: string
  declare address?: Address
  declare birth_country?: string
  declare birth_date?: DateInput
  declare citizenship_country?: string
  declare email?: string
  declare employer_name?: string
  declare employment_status?: string
  declare home_phone_number?: string
  declare is_foreign?: boolean
  declare job_title?: string
  declare marital_status?: string
  declare mobile_phone_number?: string
  declare number_of_dependents?: number
  declare occupation?: string
  declare owner_of_record?: boolean
  declare relationship_to_entity?: string
  declare tax_number?: string
  declare tax_number_type?: string
  declare usa_citizenship_type?: string
  declare visa_expiration_date?: DateInput
  declare visa_type?: string
  declare work_phone_number?: string

  constructor(data: JsonMap = {}) {
    super(data)
    if (this.address && typeof this.address === 'object') this.address = new Address(this.address as JsonMap)
  }
}

export class EntitySuitability extends SessionModel {
  declare id?: string
  declare annual_net_income?: number
  declare covered_options_trading_experience?: string
  declare entity_id?: number
  declare futures_trading_experience?: string
  declare liquid_net_worth?: number
  declare net_worth?: number
  declare stock_trading_experience?: string
  declare tax_bracket?: string
  declare uncovered_options_trading_experience?: string
}

export class CustomerAccountMarginType extends SessionModel {
  declare name?: string
  declare is_margin?: boolean
}

export class CustomerAccountType extends SessionModel {
  declare name?: string
  declare description?: string
  declare is_tax_advantaged?: boolean
  declare is_publicly_available?: boolean
  declare has_multiple_owners?: boolean
  declare margin_types?: CustomerAccountMarginType[]

  constructor(data: JsonMap = {}) {
    super(data)
    this.margin_types = ((this.margin_types as JsonMap[] | undefined) ?? []).map(
      (item) => new CustomerAccountMarginType(item)
    )
  }
}

export class CustomerEntity extends SessionModel {
  declare id?: string
  declare address?: Address
  declare business_nature?: string
  declare email?: string
  declare entity_officers?: EntityOfficer[]
  declare entity_suitability?: EntitySuitability
  declare entity_type?: string
  declare foreign_institution?: string
  declare grantor_birth_date?: DateInput
  declare grantor_email?: string
  declare grantor_first_name?: string
  declare grantor_last_name?: string
  declare grantor_middle_name?: string
  declare grantor_tax_number?: string
  declare has_foreign_bank_affiliation?: string
  declare has_foreign_institution_affiliation?: string
  declare is_domestic?: boolean
  declare legal_name?: string
  declare phone_number?: string
  declare tax_number?: string

  constructor(data: JsonMap = {}) {
    super(data)
    if (this.address && typeof this.address === 'object') this.address = new Address(this.address as JsonMap)
    this.entity_officers = ((this.entity_officers as JsonMap[] | undefined) ?? []).map((item) => new EntityOfficer(item))
    if (this.entity_suitability && typeof this.entity_suitability === 'object') {
      this.entity_suitability = new EntitySuitability(this.entity_suitability as JsonMap)
    }
  }
}

export class CustomerPerson extends SessionModel {
  declare external_id?: string
  declare first_name?: string
  declare last_name?: string
  declare citizenship_country?: string
  declare usa_citizenship_type?: string
  declare employment_status?: string
  declare marital_status?: string
  declare number_of_dependents?: number
  declare occupation?: string | null
  declare middle_name?: string | null
  declare prefix_name?: string | null
  declare suffix_name?: string | null
  declare birth_country?: string | null
  declare birth_date?: DateInput | null
  declare visa_expiration_date?: DateInput | null
  declare visa_type?: string | null
  declare employer_name?: string | null
  declare job_title?: string | null
}

export class CustomerSuitability extends SessionModel {
  declare id?: number
  declare annual_net_income?: number
  declare covered_options_trading_experience?: string
  declare employment_status?: string
  declare futures_trading_experience?: string
  declare liquid_net_worth?: number
  declare marital_status?: string
  declare net_worth?: number
  declare number_of_dependents?: number
  declare stock_trading_experience?: string
  declare uncovered_options_trading_experience?: string
  declare customer_id?: string | null
  declare employer_name?: string | null
  declare job_title?: string | null
  declare occupation?: string | null
  declare tax_bracket?: string | null
}

export class Customer extends SessionModel {
  declare id?: string
  declare first_name?: string
  declare first_surname?: string
  declare last_name?: string
  declare address?: Address
  declare customer_suitability?: CustomerSuitability
  declare mailing_address?: Address
  declare is_foreign?: boolean
  declare regulatory_domain?: string
  declare usa_citizenship_type?: string
  declare home_phone_number?: string
  declare mobile_phone_number?: string
  declare work_phone_number?: string
  declare birth_date?: DateInput
  declare email?: string
  declare external_id?: string
  declare tax_number?: string
  declare tax_number_type?: string
  declare citizenship_country?: string
  declare agreed_to_margining?: boolean
  declare subject_to_tax_withholding?: boolean
  declare agreed_to_terms?: boolean
  declare ext_crm_id?: string
  declare has_industry_affiliation?: boolean
  declare has_listed_affiliation?: boolean
  declare has_political_affiliation?: boolean
  declare has_delayed_quotes?: boolean
  declare has_pending_or_approved_application?: boolean
  declare is_professional?: boolean
  declare permitted_account_types?: CustomerAccountType[]
  declare created_at?: DateInput
  declare identifiable_type?: string
  declare person?: CustomerPerson
  declare gender?: string | null
  declare middle_name?: string | null
  declare prefix_name?: string | null
  declare second_surname?: string | null
  declare suffix_name?: string | null
  declare foreign_tax_number?: string | null
  declare birth_country?: string | null
  declare visa_expiration_date?: DateInput | null
  declare visa_type?: string | null
  declare signature_of_agreement?: boolean | null
  declare desk_customer_id?: string | null
  declare entity?: CustomerEntity | null
  declare family_member_names?: string | null
  declare has_institutional_assets?: string | boolean | null
  declare industry_affiliation_firm?: string | null
  declare is_investment_adviser?: boolean | null
  declare listed_affiliation_symbol?: string | null
  declare political_organization?: string | null
  declare user_id?: string | null

  constructor(data: JsonMap = {}) {
    super(data)
    if (this.address && typeof this.address === 'object') this.address = new Address(this.address as JsonMap)
    if (this.mailing_address && typeof this.mailing_address === 'object') {
      this.mailing_address = new Address(this.mailing_address as JsonMap)
    }
    if (this.customer_suitability && typeof this.customer_suitability === 'object') {
      this.customer_suitability = new CustomerSuitability(this.customer_suitability as JsonMap)
    }
    this.permitted_account_types = ((this.permitted_account_types as JsonMap[] | undefined) ?? []).map(
      (item) => new CustomerAccountType(item)
    )
    if (this.person && typeof this.person === 'object') this.person = new CustomerPerson(this.person as JsonMap)
    if (this.entity && typeof this.entity === 'object') this.entity = new CustomerEntity(this.entity as JsonMap)
  }
}

export class Session {
  readonly is_test: boolean
  readonly proxy: string | null
  readonly provider_secret: string
  readonly refresh_token: string
  base_url: string
  readonly fetch: FetchLike
  readonly headers: Record<string, string>
  session_expiration = 0
  session_token = 'kyrieeleison'
  streamer_expiration = 0
  streamer_token = ''
  dxlink_url = ''

  constructor(providerSecret?: string | SessionOptions, refreshToken?: string, isTest?: boolean) {
    const options = normalizeOptions(providerSecret, refreshToken, isTest)
    this.is_test = options.isTest ?? readBooleanEnv('TT_IS_TEST', false)
    this.proxy = options.proxy ?? null
    this.provider_secret = options.providerSecret ?? readEnvAny('TT_API_CLIENT_SECRET', 'TT_CLIENT_SECRET', 'TT_SECRET')
    this.refresh_token = options.refreshToken ?? readEnvAny('TT_REFRESH_TOKEN', 'TT_REFRESH')
    this.base_url = this.is_test ? CERT_URL : API_URL
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': versionStr,
      ...options.headers
    }
    if (!this.is_test) {
      this.headers['Accept-Version'] = API_VERSION
    }
  }

  serialize(): string {
    return JSON.stringify(safeSessionSnapshot(this))
  }

  exportSensitiveSessionSnapshot(): string {
    const { fetch: _fetch, ...attrs } = this
    return JSON.stringify(attrs)
  }

  static deserialize(serialized: string, options: Pick<SessionOptions, 'fetch'> = {}): Session {
    const data = JSON.parse(serialized) as JsonMap
    const init: SessionOptions = {
      providerSecret: stringValue(data.provider_secret),
      refreshToken: stringValue(data.refresh_token),
      isTest: Boolean(data.is_test)
    }
    if (options.fetch) init.fetch = options.fetch
    const session = new Session(init)
    session.session_expiration = Number(data.session_expiration)
    if (data.session_token !== undefined) session.session_token = String(data.session_token)
    session.streamer_expiration = Number(data.streamer_expiration ?? 0)
    if (data.streamer_token !== undefined) session.streamer_token = String(data.streamer_token)
    session.dxlink_url = String(data.dxlink_url ?? '')
    if (data.headers && typeof data.headers === 'object' && !Array.isArray(data.headers)) {
      Object.assign(session.headers, data.headers as Record<string, string>)
    }
    return session
  }

  async refresh(force = false): Promise<void> {
    if (!force && Date.now() / 1000 < this.session_expiration - 60) return
    const response = await this.fetch(this.url('/oauth/token'), {
      method: 'POST',
      headers: this.headersWithoutAuth(),
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_secret: this.provider_secret,
        refresh_token: this.refresh_token
      })
    })
    await validateResponse(response)
    const data = (await response.json()) as JsonMap
    this.session_token = String(data.access_token)
    const tokenLifetime = Number(data.expires_in ?? 900)
    this.session_expiration = Date.now() / 1000 + tokenLifetime
    this.headers.Authorization = `Bearer ${this.session_token}`
  }

  async refreshStreamerToken(): Promise<void> {
    if (this.is_test) return
    const data = await this.requestData('GET', '/api-quote-tokens', {}, false)
    this._streamer_refresh(data)
  }

  async refresh_streamer_token(): Promise<void> {
    await this.refreshStreamerToken()
  }

  _streamer_refresh(data: JsonMap): void {
    this.streamer_token = String(data.token)
    this.dxlink_url = String(data['dxlink-url'])
    const expiresAt = data['expires-at']
    this.streamer_expiration =
      typeof expiresAt === 'string' ? Date.parse(expiresAt) / 1000 : Number(expiresAt ?? this.streamer_expiration)
  }

  async validate(): Promise<boolean> {
    const response = await this.fetch(this.url('/sessions/validate'), {
      method: 'POST',
      headers: this.headers
    })
    return Math.floor(response.status / 100) === 2
  }

  async getCustomer(): Promise<Customer> {
    return new Customer(await this._get('/customers/me'))
  }

  async get_customer(): Promise<Customer> {
    return this.getCustomer()
  }

  async a_get_customer(): Promise<Customer> {
    return this.getCustomer()
  }

  async a_validate(): Promise<boolean> {
    return this.validate()
  }

  async a_refresh(): Promise<void> {
    await this.refresh()
  }

  async _get(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    return this.requestData('GET', url, init)
  }

  async _a_get(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    return this._get(url, init)
  }

  async _delete(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<void> {
    await this.refresh()
    const response = await this.fetch(this.url(url, init.params), {
      ...init,
      method: 'DELETE',
      headers: { ...this.headers, ...(init.headers as Record<string, string> | undefined) }
    })
    await validateResponse(response)
  }

  async _a_delete(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<void> {
    await this._delete(url, init)
  }

  async _post(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    return this.requestData('POST', url, init)
  }

  async _a_post(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    return this._post(url, init)
  }

  async _put(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    return this.requestData('PUT', url, init)
  }

  async _a_put(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    return this._put(url, init)
  }

  async _paginate<T>(
    factory: (item: JsonMap) => T,
    url: string,
    params: PageParams
  ): Promise<T[]> {
    const res: T[] = []
    const mutableParams: PageParams = { ...params }
    const paginate = mutableParams['page-offset'] === null
    if (paginate) mutableParams['page-offset'] = 0

    while (true) {
      const page = await this.requestJson('GET', url, { params: compactParams(mutableParams) })
      const data = page.data
      const items = (data.items as JsonMap[] | undefined) ?? []
      res.push(...items.map(factory))
      const pagination = page.pagination
      const pageOffset = Number(pagination?.['page-offset'] ?? mutableParams['page-offset'])
      const totalPages = Number(pagination?.['total-pages'] ?? 0)
      if (!pagination || !paginate || pageOffset >= totalPages - 1) break
      mutableParams['page-offset'] = Number(mutableParams['page-offset']) + 1
    }
    return res
  }

  private url(path: string, params?: Record<string, unknown>): string {
    const base = new URL(this.base_url)
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const basePath = base.pathname === '/' ? '/' : `${base.pathname.replace(/\/$/, '')}/`
    const url = new URL(`${basePath}${cleanPath}`, base.origin)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) continue
        if (Array.isArray(value)) {
          for (const item of value) url.searchParams.append(key, String(item))
        } else {
          url.searchParams.set(key, String(value))
        }
      }
    }
    return url.toString()
  }

  private headersWithoutAuth(): Record<string, string> {
    const { Authorization: _authorization, ...headers } = this.headers
    return headers
  }

  private async requestData(
    method: string,
    path: string,
    init: RequestInit & { params?: Record<string, unknown> } = {},
    refreshFirst = true
  ): Promise<JsonMap> {
    const response = await this.request(method, path, init, refreshFirst)
    return validateAndParse(response)
  }

  private async requestJson(
    method: string,
    path: string,
    init: RequestInit & { params?: Record<string, unknown> } = {},
    refreshFirst = true
  ): Promise<{ data: JsonMap; pagination?: JsonMap }> {
    const response = await this.request(method, path, init, refreshFirst)
    await validateResponse(response)
    const json = (await response.json()) as JsonMap
    const data = json.data
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new TastytradeError(`No data present in response: ${JSON.stringify(json)}`)
    }
    const result: { data: JsonMap; pagination?: JsonMap } = { data: data as JsonMap }
    if (json.pagination && typeof json.pagination === 'object' && !Array.isArray(json.pagination)) {
      result.pagination = json.pagination as JsonMap
    }
    return result
  }

  private async request(
    method: string,
    path: string,
    init: RequestInit & { params?: Record<string, unknown> } = {},
    refreshFirst = true
  ): Promise<Response> {
    if (refreshFirst) await this.refresh()
    const { params, headers, ...requestInit } = init
    return this.fetch(this.url(path, params), {
      ...requestInit,
      method,
      headers: { ...this.headers, ...(headers as Record<string, string> | undefined) }
    })
  }
}

export class ReadOnlySession implements ReadOnlySessionLike {
  private readonly session: Session

  constructor(providerSecret?: string | SessionOptions | Session, refreshToken?: string, isTest?: boolean) {
    this.session =
      providerSecret instanceof Session ? providerSecret : new Session(providerSecret as string | SessionOptions | undefined, refreshToken, isTest)
  }

  static fromSession(session: Session): ReadOnlySession {
    return new ReadOnlySession(session)
  }

  get is_test(): boolean {
    return this.session.is_test
  }

  get proxy(): string | null {
    return this.session.proxy
  }

  get base_url(): string {
    return this.session.base_url
  }

  get fetch(): FetchLike {
    return this.session.fetch
  }

  get headers(): Record<string, string> {
    return this.session.headers
  }

  get session_expiration(): number {
    return this.session.session_expiration
  }

  set session_expiration(value: number) {
    this.session.session_expiration = value
  }

  get session_token(): string {
    return this.session.session_token
  }

  set session_token(value: string) {
    this.session.session_token = value
  }

  get streamer_expiration(): number {
    return this.session.streamer_expiration
  }

  set streamer_expiration(value: number) {
    this.session.streamer_expiration = value
  }

  get streamer_token(): string {
    return this.session.streamer_token
  }

  set streamer_token(value: string) {
    this.session.streamer_token = value
  }

  get dxlink_url(): string {
    return this.session.dxlink_url
  }

  set dxlink_url(value: string) {
    this.session.dxlink_url = value
  }

  serialize(): string {
    return this.session.serialize()
  }

  async refresh(force = false): Promise<void> {
    await this.session.refresh(force)
  }

  async refreshStreamerToken(): Promise<void> {
    await this.session.refreshStreamerToken()
  }

  async refresh_streamer_token(): Promise<void> {
    await this.session.refresh_streamer_token()
  }

  async validate(): Promise<boolean> {
    return this.session.validate()
  }

  async a_validate(): Promise<boolean> {
    return this.session.a_validate()
  }

  async a_refresh(): Promise<void> {
    await this.session.a_refresh()
  }

  async _get(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    return this.session._get(url, init)
  }

  async _a_get(url: string, init: RequestInit & { params?: Record<string, unknown> } = {}): Promise<JsonMap> {
    return this.session._a_get(url, init)
  }

  async _paginate<T>(factory: (item: JsonMap) => T, url: string, params: PageParams): Promise<T[]> {
    return this.session._paginate(factory, url, params)
  }
}

function normalizeOptions(providerSecret?: string | SessionOptions, refreshToken?: string, isTest?: boolean): SessionOptions {
  if (typeof providerSecret === 'object') {
    return { ...providerSecret }
  }
  const options: SessionOptions = {}
  if (providerSecret !== undefined) options.providerSecret = providerSecret
  if (refreshToken !== undefined) options.refreshToken = refreshToken
  if (isTest !== undefined) options.isTest = isTest
  return options
}

function compactParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== null && value !== undefined))
}

function readEnvAny(...keys: string[]): string {
  for (const key of keys) {
    const value = globalThis.process?.env?.[key]
    if (value) return value
  }
  throw new Error(`Missing required environment variable ${keys.join(' or ')}`)
}

function readBooleanEnv(key: string, fallback: boolean): boolean {
  const value = globalThis.process?.env?.[key]
  if (value === undefined || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function stringValue(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

function safeSessionSnapshot(session: Session): JsonMap {
  return sanitizeSnapshot({
    is_test: session.is_test,
    proxy: session.proxy,
    base_url: session.base_url,
    headers: session.headers,
    session_expiration: session.session_expiration,
    streamer_expiration: session.streamer_expiration,
    dxlink_url: session.dxlink_url
  }) as JsonMap
}

function sanitizeSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSnapshot(item)).filter((item) => item !== undefined)
  }
  if (!value || typeof value !== 'object') return isSensitiveValue(value) ? undefined : value

  const safe: JsonMap = {}
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key) || isSensitiveValue(nestedValue)) continue
    const sanitizedValue = sanitizeSnapshot(nestedValue)
    if (sanitizedValue !== undefined) safe[key] = sanitizedValue
  }
  return safe
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part))
}

function isSensitiveValue(value: unknown): boolean {
  return typeof value === 'string' && /^bearer\s+/i.test(value)
}

const SENSITIVE_KEY_PARTS = [
  'authorization',
  'auth',
  'bearer',
  'cookie',
  'setcookie',
  'apikey',
  'token',
  'secret',
  'credential',
  'credentials',
  'password',
  'passwd',
  'pwd',
  'privatekey'
]
