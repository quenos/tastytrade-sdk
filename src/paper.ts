import { Account } from './account.js'
import { PAPER_URL } from './constants.js'
import { DecimalValue, type DecimalInput } from './decimal.js'
import { Session, type SessionOptions } from './session.js'
import { AlertStreamer, type WebSocketFactory } from './streamer.js'
import { TastytradeError, validateResponse } from './utils.js'

export interface PaperSessionOptions extends Pick<SessionOptions, 'fetch'> {
  headers?: Record<string, string>
}

export class PaperSession extends Session {
  readonly api_key: string

  constructor(apiKey: string, options: PaperSessionOptions = {}) {
    const sessionOptions: SessionOptions = {
      providerSecret: 'kyrie',
      refreshToken: 'eleison',
      isTest: true,
      headers: {
        'X-Api-Key': apiKey,
        ...options.headers
      }
    }
    if (options.fetch) sessionOptions.fetch = options.fetch
    super(sessionOptions)
    this.api_key = apiKey
    this.base_url = PAPER_URL
    this.session_expiration = Number.POSITIVE_INFINITY
  }

  override async refresh(): Promise<void> {
    return
  }

  async createAccount(
    name: string,
    marginOrCash: 'Cash' | 'Margin' = 'Margin',
    initialDeposit = 100_000
  ): Promise<Account> {
    const data = await this._post('/accounts', {
      body: JSON.stringify({
        account_name: name,
        margin_or_cash: marginOrCash,
        initial_deposit: initialDeposit
      })
    })
    return new Account(data)
  }

  async deleteAccount(account: Account | { account_number: string }): Promise<void> {
    await this._delete('/accounts', { params: { account_number: account.account_number } })
  }

  async deposit(account: Account | { account_number: string }, amount: DecimalInput): Promise<void> {
    const response = await this.fetch(
      `${this.base_url}/accounts/deposit?account_number=${encodeURIComponent(account.account_number)}&amount=${formatMoney(amount)}`,
      {
        method: 'POST',
        headers: this.headers
      }
    )
    await validateResponse(response)
  }

  async temporaryAccount<T>(
    fn: (account: Account) => Promise<T>,
    marginOrCash: 'Cash' | 'Margin' = 'Margin'
  ): Promise<T> {
    const account = await this.createAccount(crypto.randomUUID().replaceAll('-', ''), marginOrCash)
    try {
      return await fn(account)
    } finally {
      await this.deleteAccount(account)
    }
  }
}

export class PaperAlertStreamer extends AlertStreamer {
  constructor(session: PaperSession, webSocketFactory?: WebSocketFactory) {
    super(session, webSocketFactory)
    this.base_url = `${PAPER_URL.replace('http', 'ws')}/notifications`
  }

  fail(): never {
    throw new TastytradeError('Something happened and the fake streamer broke, oh no!')
  }
}

function formatMoney(amount: DecimalInput): string {
  return Number(new DecimalValue(amount).toString()).toFixed(2)
}
