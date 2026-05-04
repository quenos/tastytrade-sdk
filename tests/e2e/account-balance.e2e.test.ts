import assert from 'node:assert/strict'
import test from 'node:test'

import { Account, AccountBalance, Session, TastytradeError } from '../../src/index.js'

const accountId = process.env.TT_ACCOUNT_ID
const hasOAuthSecret = Boolean(process.env.TT_SECRET || process.env.TT_CLIENT_SECRET || process.env.TT_API_CLIENT_SECRET)
const hasRefreshToken = Boolean(process.env.TT_REFRESH || process.env.TT_REFRESH_TOKEN)
const skipReason =
  !accountId || !hasOAuthSecret || !hasRefreshToken
    ? 'Set TT_ACCOUNT_ID plus TT_SECRET, TT_CLIENT_SECRET, or TT_API_CLIENT_SECRET, and TT_REFRESH or TT_REFRESH_TOKEN to run live account balance E2E tests.'
    : false

test('E2E: gets account balance for TT_ACCOUNT_ID', { skip: skipReason }, async () => {
  assert.ok(accountId)

  const session = new Session()
  const account = await withOAuthHint(() => Account.get(session, accountId))
  assert.ok(account instanceof Account)
  assert.equal(account.account_number, accountId)

  const balance = await withOAuthHint(() => account.get_balances(session))
  assert.ok(balance instanceof AccountBalance)
  assert.equal(balance.account_number, accountId)
  assert.ok(balance.data)

  console.log('Fetched account balance:', JSON.stringify(accountBalanceSummary(balance)))
})

function accountBalanceSummary(balance: AccountBalance): Record<string, unknown> {
  const summaryFields = [
    'account_number',
    'cash_balance',
    'net_liquidating_value',
    'long_equity_value',
    'short_equity_value',
    'buying_power'
  ] as const

  return Object.fromEntries(
    summaryFields.flatMap((field) => (balance[field] === undefined ? [] : [[field, balance[field]]]))
  )
}

async function withOAuthHint<T>(fn: () => Promise<T>): Promise<T> {
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

function selectedSecretName(): string {
  if (process.env.TT_API_CLIENT_SECRET) return 'TT_API_CLIENT_SECRET'
  if (process.env.TT_CLIENT_SECRET) return 'TT_CLIENT_SECRET'
  if (process.env.TT_SECRET) return 'TT_SECRET'
  return 'no OAuth secret'
}

function selectedRefreshName(): string {
  if (process.env.TT_REFRESH_TOKEN) return 'TT_REFRESH_TOKEN'
  if (process.env.TT_REFRESH) return 'TT_REFRESH'
  return 'no refresh token'
}
