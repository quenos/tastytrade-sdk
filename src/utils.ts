import { DecimalValue, type DecimalInput } from './decimal.js'

export enum PriceEffect {
  CREDIT = 'Credit',
  DEBIT = 'Debit',
  NONE = 'None'
}

export class TastytradeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TastytradeError'
  }
}

export type JsonMap = Record<string, unknown>

export interface TastytradeDataOptions {
  decimalFields?: string[]
}

export class TastytradeData {
  [key: string]: unknown
  readonly data: JsonMap

  constructor(input: JsonMap = {}, options: TastytradeDataOptions = {}) {
    this.data = parseTastyObject(input, options)
    Object.assign(this, this.data)
  }

  toString(): string {
    return Object.entries(this.data)
      .filter(([, value]) => value !== undefined && value !== null && value !== false)
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(' ')
  }
}

export interface PaginatableSession {
  _paginate<T>(factory: (item: JsonMap) => T, url: string, params: { 'page-offset': number | null; 'per-page': number; [key: string]: unknown }): Promise<T[]>
}

export async function paginate<T>(
  session: PaginatableSession,
  factory: (item: JsonMap) => T,
  url: string,
  params: { 'page-offset': number | null; 'per-page': number; [key: string]: unknown }
): Promise<T[]> {
  return session._paginate(factory, url, params)
}

export const a_paginate = paginate

export function dasherize(key: string): string {
  return key.replaceAll('_', '-')
}

export function camelize(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

export function snakeize(key: string): string {
  return key
    .replace(/-/g, '_')
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

export function getAliasValue(data: JsonMap, snakeKey: string): unknown {
  return data[snakeKey] ?? data[dasherize(snakeKey)] ?? data[camelize(snakeKey)]
}

export function intuitiveIterable<T>(value: Iterable<T> | T): Iterable<T> {
  if (typeof value === 'string') {
    return [value as T]
  }
  if (isIterable(value)) {
    return value
  }
  return [value]
}

export function getSign(value: DecimalInput | null | undefined): PriceEffect | null {
  if (value === null || value === undefined) return null
  const decimal = new DecimalValue(value)
  if (decimal.toString() === '0') return null
  return decimal.isNegative() ? PriceEffect.DEBIT : PriceEffect.CREDIT
}

export function setSignFor<T extends JsonMap>(data: T, properties: string[]): T {
  const copy: JsonMap = { ...data }
  for (const property of properties) {
    const key = dasherize(property)
    const effect = copy[`${key}-effect`] ?? copy[`${property}_effect`]
    const value = copy[key] ?? copy[property]
    if (effect === PriceEffect.DEBIT && value !== undefined && value !== null) {
      copy[key] = `-${new DecimalValue(value as DecimalInput).abs().toString()}`
    }
  }
  return copy as T
}

export function toDecimalOrNull(value: unknown): DecimalValue | null {
  if (value === null || value === undefined || isDxMissing(value)) return null
  return new DecimalValue(value as DecimalInput)
}

export function parseTastyObject(data: JsonMap, options: { decimalFields?: string[] } = {}): JsonMap {
  const decimalFields = new Set(options.decimalFields ?? [])
  const parsed: JsonMap = {}
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = snakeize(key)
    parsed[snakeKey] = decimalFields.has(snakeKey) ? toDecimalOrNull(value) : parseValue(value)
  }
  return parsed
}

export function toApiObject(
  value: unknown,
  options: { byAlias?: boolean; excludeNone?: boolean } = {}
): unknown {
  if (value instanceof DecimalValue) return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map((item) => toApiObject(item, options))
  if (!value || typeof value !== 'object') return value

  const source =
    typeof (value as { toJSON?: () => unknown }).toJSON === 'function'
      ? ((value as { toJSON: () => unknown }).toJSON() as unknown)
      : value
  if (!source || typeof source !== 'object' || Array.isArray(source)) return source

  const out: JsonMap = {}
  for (const [key, item] of Object.entries(source as JsonMap)) {
    if (options.excludeNone && (item === null || item === undefined)) continue
    out[options.byAlias ? dasherize(key) : key] = toApiObject(item, options)
  }
  return out
}

export async function validateResponse(response: Response): Promise<void> {
  if (Math.floor(response.status / 100) === 2) return
  const text = await response.text()
  let json: JsonMap
  try {
    json = JSON.parse(text) as JsonMap
  } catch (error) {
    throw new TastytradeError(`Couldn't parse response: ${text}`)
  }
  const content = json.error as JsonMap | undefined
  if (!content) {
    if ('error_code' in json || 'error_description' in json) {
      throw new TastytradeError(`${String(json.error_code ?? 'oauth_error')}: ${String(json.error_description ?? '')}\n`)
    }
    throw new TastytradeError(`Couldn't parse response: ${JSON.stringify(json)}`)
  }
  const errors = (content.errors as JsonMap[] | undefined) ?? [content]
  let message = ''
  for (const error of errors) {
    if ('code' in error && 'message' in error) {
      message += `${String(error.code)}: ${String(error.message)}\n`
    } else if ('domain' in error && 'reason' in error) {
      message += `${String(error.domain)}: ${String(error.reason)}\n`
    }
  }
  throw new TastytradeError(message)
}

export async function validateAndParse(response: Response): Promise<JsonMap> {
  await validateResponse(response)
  const json = (await response.json()) as JsonMap
  const data = json.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new TastytradeError(`No data present in response: ${JSON.stringify(json)}`)
  }
  return data as JsonMap
}

function parseValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(parseValue)
  if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof DecimalValue)) {
    return parseTastyObject(value as JsonMap)
  }
  return value
}

function isDxMissing(value: unknown): boolean {
  return value === 'NaN' || value === 'Infinity' || value === '-Infinity'
}

function isIterable<T>(value: unknown): value is Iterable<T> {
  return !!value && typeof (value as Iterable<T>)[Symbol.iterator] === 'function'
}

export const _dasherize = dasherize
export const get_alias_value = getAliasValue
export const intuitive_iterable = intuitiveIterable
export const get_sign = getSign
export const set_sign_for = setSignFor
export const to_decimal_or_null = toDecimalOrNull
export const parse_tasty_object = parseTastyObject
export const to_api_object = toApiObject
export const validate_response = validateResponse
export const validate_and_parse = validateAndParse
export {
  get_future_fx_monthly,
  get_future_grain_monthly,
  get_future_index_monthly,
  get_future_metal_monthly,
  get_future_oil_monthly,
  get_future_treasury_monthly,
  get_tasty_monthly,
  get_third_friday,
  is_market_open_now,
  is_market_open_on,
  now_in_new_york,
  today_in_new_york
} from './calendar.js'
