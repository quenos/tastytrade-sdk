import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  InstrumentType,
  OptionType,
  TastytradeError,
  getMarketData,
  type Option,
  type Session
} from '../../src/index.js'

export const SPY_SYMBOL = 'SPY'
export const TARGET_DTE = 45
export const MAX_DTE_DRIFT = 30

loadEnvFiles()

export const accountId = process.env.TT_ACCOUNT_ID
export const hasOAuthSecret = Boolean(process.env.TT_SECRET || process.env.TT_CLIENT_SECRET || process.env.TT_API_CLIENT_SECRET)
export const hasRefreshToken = Boolean(process.env.TT_REFRESH || process.env.TT_REFRESH_TOKEN)
export const authSkipReason =
  !hasOAuthSecret || !hasRefreshToken
    ? 'Set TT_SECRET, TT_CLIENT_SECRET, or TT_API_CLIENT_SECRET, and TT_REFRESH or TT_REFRESH_TOKEN to run live read-only E2E tests.'
    : false
export const accountSkipReason =
  !accountId || authSkipReason
    ? 'Set TT_ACCOUNT_ID plus TT_SECRET, TT_CLIENT_SECRET, or TT_API_CLIENT_SECRET, and TT_REFRESH or TT_REFRESH_TOKEN to run live account E2E tests.'
    : false

export interface UnderlyingReferencePrice {
  price: number | null
  source: string
  bid: string | null
  ask: string | null
  mid: string | null
  last: string | null
  mark: string | null
  error?: string
}

export async function withOAuthHint<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof TastytradeError && error.message.includes('401 Authorization Required')) {
      throw new Error(
        [
          'OAuth refresh was rejected by Tastytrade.',
          `The E2E selected ${selectedSecretName()} and ${selectedRefreshName()}.`,
          'Check that TT_SECRET, TT_CLIENT_SECRET, or TT_API_CLIENT_SECRET is the OAuth client secret, not TT_CLIENT_ID.',
          'Check that TT_REFRESH or TT_REFRESH_TOKEN was created from that same production OAuth app.',
          'Production credentials should leave TT_IS_TEST unset or false.'
        ].join(' ')
      )
    }
    throw error
  }
}

export async function getUnderlyingReferencePrice(
  session: Session,
  symbol = SPY_SYMBOL
): Promise<UnderlyingReferencePrice> {
  try {
    const marketData = await withOAuthHint(() => getMarketData(session, symbol, InstrumentType.EQUITY))
    const bid = finitePositiveNumber(marketData.bid)
    const ask = finitePositiveNumber(marketData.ask)
    const quoteMid = bid !== null && ask !== null && ask >= bid ? (bid + ask) / 2 : null
    const candidates = [
      { source: 'bid-ask-mid', price: quoteMid },
      { source: 'mid', price: finitePositiveNumber(marketData.mid) },
      { source: 'last', price: finitePositiveNumber(marketData.last) },
      { source: 'mark', price: finitePositiveNumber(marketData.mark) },
      { source: 'last-mkt', price: finitePositiveNumber(marketData.last_mkt) },
      { source: 'prev-close', price: finitePositiveNumber(marketData.prev_close) }
    ]
    const selected = candidates.find((candidate) => candidate.price !== null)

    return {
      price: selected?.price ?? null,
      source: selected?.source ?? 'unavailable',
      bid: marketData.bid?.toString() ?? null,
      ask: marketData.ask?.toString() ?? null,
      mid: marketData.mid?.toString() ?? null,
      last: marketData.last?.toString() ?? null,
      mark: marketData.mark?.toString() ?? null
    }
  } catch (error) {
    return {
      price: null,
      source: 'market-data-error',
      bid: null,
      ask: null,
      mid: null,
      last: null,
      mark: null,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export function selectOptionPairAroundDte(
  chain: Record<string, Option[]>,
  targetDte = TARGET_DTE,
  underlyingPrice: number | null = null
): {
  expiration: string
  call: Option
  put: Option
  dte: number
} | null {
  const today = startOfUtcDay(new Date())
  const candidates = Object.entries(chain)
    .map(([expiration, options]) => ({
      expiration,
      options,
      dte: Math.round((startOfUtcDay(new Date(`${expiration}T00:00:00Z`)).getTime() - today.getTime()) / 86_400_000)
    }))
    .filter(({ dte, options }) => dte > 0 && Math.abs(dte - targetDte) <= MAX_DTE_DRIFT && options.length > 0)
    .sort((a, b) => Math.abs(a.dte - targetDte) - Math.abs(b.dte - targetDte))

  for (const candidate of candidates) {
    const pair = selectCallPutPair(candidate.options, underlyingPrice)
    if (pair) return { expiration: candidate.expiration, dte: candidate.dte, ...pair }
  }

  return null
}

export function selectedStreamerSymbols(pair: { call: Option; put: Option }): string[] {
  return [pair.call.streamer_symbol, pair.put.streamer_symbol].filter((symbol): symbol is string => Boolean(symbol))
}

export async function waitFor<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
        timeout.unref?.()
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export function selectedSecretName(): string {
  if (process.env.TT_API_CLIENT_SECRET) return 'TT_API_CLIENT_SECRET'
  if (process.env.TT_CLIENT_SECRET) return 'TT_CLIENT_SECRET'
  if (process.env.TT_SECRET) return 'TT_SECRET'
  return 'no OAuth secret'
}

export function selectedRefreshName(): string {
  if (process.env.TT_REFRESH_TOKEN) return 'TT_REFRESH_TOKEN'
  if (process.env.TT_REFRESH) return 'TT_REFRESH'
  return 'no refresh token'
}

function selectCallPutPair(options: Option[], underlyingPrice: number | null): { call: Option; put: Option } | null {
  const callsByStrike = new Map<string, Option>()
  const putsByStrike = new Map<string, Option>()

  for (const option of options) {
    const strike = option.strike_price?.toString()
    if (!strike || !option.streamer_symbol) continue
    if (option.option_type === OptionType.CALL) callsByStrike.set(strike, option)
    if (option.option_type === OptionType.PUT) putsByStrike.set(strike, option)
  }

  const pairedStrikes = Array.from(callsByStrike.keys()).filter((strike) => putsByStrike.has(strike))
  const numericPairedStrikes = pairedStrikes
    .map((strike) => ({ strike, value: Number(strike) }))
    .filter(({ value }) => Number.isFinite(value))
    .sort((a, b) => {
      if (underlyingPrice !== null && Number.isFinite(underlyingPrice)) {
        const distance = Math.abs(a.value - underlyingPrice) - Math.abs(b.value - underlyingPrice)
        if (distance !== 0) return distance
      }
      return a.value - b.value
    })
  const strike =
    underlyingPrice !== null && Number.isFinite(underlyingPrice)
      ? numericPairedStrikes[0]?.strike
      : numericPairedStrikes[Math.floor(numericPairedStrikes.length / 2)]?.strike
  if (!strike) return null

  return {
    call: callsByStrike.get(strike)!,
    put: putsByStrike.get(strike)!
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function finitePositiveNumber(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function loadEnvFiles(): void {
  for (const file of ['.env', '.env.local']) {
    const path = resolve(process.cwd(), file)
    if (existsSync(path)) loadEnvFile(path)
  }
}

function loadEnvFile(path: string): void {
  const text = readFileSync(path, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed)
    if (!match) continue

    const key = match[1]
    const rawValue = match[2]
    if (!key || rawValue === undefined) continue
    if (process.env[key] !== undefined) continue
    process.env[key] = parseEnvValue(rawValue)
  }
}

function parseEnvValue(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed.replace(/\s+#.*$/, '')
}
