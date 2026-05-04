import assert from 'node:assert/strict'
import test, { type TestContext } from 'node:test'

import WebSocket from 'ws'

import {
  Account,
  CurrentPosition,
  DXLinkStreamer,
  Greeks,
  Option,
  OptionType,
  Quote,
  Session,
  TimeAndSale,
  getOptionChain,
  type WebSocketLike
} from '../../src/index.js'
import {
  SPY_SYMBOL,
  getUnderlyingReferencePrice,
  accountId,
  accountSkipReason,
  authSkipReason,
  selectOptionPairAroundDte,
  selectedStreamerSymbols,
  waitFor,
  withOAuthHint
} from './live-helpers.js'

const STREAMER_CONNECT_TIMEOUT_MS = 15_000
const STREAMER_SUBSCRIBE_TIMEOUT_MS = 15_000
const STREAMER_EVENT_TIMEOUT_MS = 30_000
const STREAMER_CONNECT_ATTEMPTS = 2

test('E2E: reads account portfolio positions for TT_ACCOUNT_ID', { skip: accountSkipReason }, async () => {
  assert.ok(accountId)

  const session = new Session()
  const account = await withOAuthHint(() => Account.get(session, accountId))
  assert.ok(account instanceof Account)
  assert.equal(account.account_number, accountId)

  const positions = await withOAuthHint(() =>
    account.get_positions(session, {
      include_closed: false,
      include_marks: true,
      net_positions: true
    })
  )

  assert.ok(Array.isArray(positions))
  for (const position of positions) {
    assert.ok(position instanceof CurrentPosition)
    assert.equal(position.account_number, accountId)
    assert.ok(position.symbol || position.underlying_symbol)
  }

  console.log('Fetched account positions:', JSON.stringify(positionSummary(positions)))
})

test(`E2E: reads ${SPY_SYMBOL} option chain and selects call/put around 45 DTE`, { skip: authSkipReason }, async (t) => {
  const session = new Session()
  const referencePrice = await getUnderlyingReferencePrice(session, SPY_SYMBOL)
  const chain = await withOAuthHint(() => getOptionChain(session, SPY_SYMBOL))
  const pair = selectOptionPairAroundDte(chain, undefined, referencePrice.price)

  if (!pair) {
    t.skip(`No usable ${SPY_SYMBOL} option pair with streamer symbols was returned by the option chain.`)
    return
  }

  assert.ok(pair.call instanceof Option)
  assert.ok(pair.put instanceof Option)
  assert.equal(pair.call.option_type, OptionType.CALL)
  assert.equal(pair.put.option_type, OptionType.PUT)
  assert.equal(pair.call.expiration_date, pair.put.expiration_date)
  assert.equal(pair.call.strike_price?.toString(), pair.put.strike_price?.toString())
  assert.ok(Math.abs(pair.dte - 45) <= 30, `selected expiration ${pair.expiration} is ${pair.dte} DTE`)

  console.log(
    'Selected SPY option pair:',
    JSON.stringify({
      expiration: pair.expiration,
      dte: pair.dte,
      underlying_reference: referencePrice,
      strike: pair.call.strike_price?.toString(),
      call: pair.call.symbol,
      put: pair.put.symbol,
      call_streamer_symbol: pair.call.streamer_symbol,
      put_streamer_symbol: pair.put.streamer_symbol
    })
  )
})

test('E2E: streams SPY quote when supported', { skip: authSkipReason }, async (t) => {
  const session = new Session()
  if (skipDxLinkForTestSession(t, session)) return

  const streamer = new DXLinkStreamer(session, (url) => new LiveWebSocket(url))
  try {
    await connectStreamer(streamer)

    const quotePromise = streamer.getEvent(Quote) as Promise<Quote>
    await waitFor(
      streamer.subscribe(Quote, SPY_SYMBOL),
      STREAMER_SUBSCRIBE_TIMEOUT_MS,
      'Timed out subscribing to SPY quotes.'
    )

    const quote = await waitFor(quotePromise, STREAMER_EVENT_TIMEOUT_MS, 'Timed out waiting for a SPY quote event.')

    assert.equal(quote.event_symbol, SPY_SYMBOL)
    assert.ok(Number(quote.bid_price) >= 0)
    assert.ok(Number(quote.ask_price) >= 0)

    console.log(
      'Received SPY quote:',
      JSON.stringify({
        symbol: quote.event_symbol,
        bid_price: quote.bid_price?.toString(),
        ask_price: quote.ask_price?.toString(),
        bid_size: quote.bid_size?.toString() ?? null,
        ask_size: quote.ask_size?.toString() ?? null
      })
    )
  } finally {
    await streamer.close()
  }
})

test('E2E: streams SPY time and sale trade print when supported', { skip: authSkipReason }, async (t) => {
  const session = new Session()
  if (skipDxLinkForTestSession(t, session)) return

  const streamer = new DXLinkStreamer(session, (url) => new LiveWebSocket(url))
  try {
    await connectStreamer(streamer)

    const tradePromise = nextMatchingEvent(streamer.listen(TimeAndSale) as AsyncIterable<TimeAndSale>, isActualTradePrint)
    await waitFor(
      streamer.subscribe(TimeAndSale, SPY_SYMBOL),
      STREAMER_SUBSCRIBE_TIMEOUT_MS,
      'Timed out subscribing to SPY time and sales.'
    )

    const trade = await waitFor(
      tradePromise,
      STREAMER_EVENT_TIMEOUT_MS,
      'Timed out waiting for a SPY time and sale trade print.'
    )

    assert.equal(trade.event_symbol, SPY_SYMBOL)
    assert.ok(Number(trade.price) > 0)
    assert.ok(Number(trade.size) > 0)

    console.log(
      'Received SPY time and sale trade print:',
      JSON.stringify({
        symbol: trade.event_symbol,
        price: trade.price?.toString(),
        size: trade.size,
        time: trade.time,
        sequence: trade.sequence,
        exchange_code: trade.exchange_code,
        exchange_sale_conditions: trade.exchange_sale_conditions,
        extended_trading_hours: trade.extended_trading_hours,
        valid_tick: trade.valid_tick,
        type: trade.type
      })
    )
  } finally {
    await streamer.close()
  }
})

test('E2E: streams selected option greeks when supported', { skip: authSkipReason }, async (t) => {
  const session = new Session()
  if (skipDxLinkForTestSession(t, session)) return

  const chain = await withOAuthHint(() => getOptionChain(session, SPY_SYMBOL))
  const referencePrice = await getUnderlyingReferencePrice(session, SPY_SYMBOL)
  const pair = selectOptionPairAroundDte(chain, undefined, referencePrice.price)
  if (!pair) {
    t.skip(`No usable ${SPY_SYMBOL} option pair with streamer symbols was returned by the option chain.`)
    return
  }

  const optionStreamerSymbols = selectedStreamerSymbols(pair)
  if (optionStreamerSymbols.length === 0) {
    t.skip('Selected option pair did not include streamer symbols for greeks subscription.')
    return
  }

  const streamer = new DXLinkStreamer(session, (url) => new LiveWebSocket(url))
  try {
    await connectStreamer(streamer)

    const greeksPromise = streamer.getEvent(Greeks) as Promise<Greeks>

    await waitFor(
      streamer.subscribe(Greeks, optionStreamerSymbols),
      STREAMER_SUBSCRIBE_TIMEOUT_MS,
      'Timed out subscribing to selected option greeks.'
    )

    const greeks = await waitFor(
      greeksPromise,
      STREAMER_EVENT_TIMEOUT_MS,
      'Timed out waiting for an option greeks event.'
    )

    assert.ok(optionStreamerSymbols.includes(greeks.event_symbol))
    assert.ok(Number.isFinite(Number(greeks.delta)))
    assert.ok(Number.isFinite(Number(greeks.gamma)))
    assert.ok(Number.isFinite(Number(greeks.theta)))
    assert.ok(Number.isFinite(Number(greeks.vega)))

    console.log(
      'Received selected option greeks:',
      JSON.stringify({
        symbol: greeks.event_symbol,
        selected_symbols: optionStreamerSymbols,
        underlying_reference: referencePrice,
        strike: pair.call.strike_price?.toString(),
        expiration: pair.expiration,
        dte: pair.dte,
        price: greeks.price?.toString(),
        volatility: greeks.volatility?.toString(),
        delta: greeks.delta?.toString(),
        gamma: greeks.gamma?.toString(),
        theta: greeks.theta?.toString(),
        vega: greeks.vega?.toString()
      })
    )
  } finally {
    await streamer.close()
  }
})

function positionSummary(positions: CurrentPosition[]): Record<string, unknown> {
  return {
    count: positions.length,
    sample: positions.slice(0, 5).map((position) => ({
      symbol: position.symbol,
      underlying_symbol: position.underlying_symbol,
      instrument_type: position.instrument_type,
      quantity: position.quantity
    }))
  }
}

async function nextMatchingEvent<T>(events: AsyncIterable<T>, predicate: (event: T) => boolean): Promise<T> {
  for await (const event of events) {
    if (predicate(event)) return event
  }
  throw new Error('Event stream ended before a matching event was received.')
}

function isActualTradePrint(event: TimeAndSale): boolean {
  return (
    event.event_symbol === SPY_SYMBOL &&
    !event.pending &&
    !event.remove &&
    Number(event.price) > 0 &&
    Number(event.size) > 0
  )
}

function skipDxLinkForTestSession(t: TestContext, session: Session): boolean {
  if (!session.is_test) return false
  t.skip('dxLink streamer quote tokens are not fetched for TT_IS_TEST sessions.')
  return true
}

async function connectStreamer(streamer: DXLinkStreamer): Promise<void> {
  let lastError: unknown
  for (let attempt = 1; attempt <= STREAMER_CONNECT_ATTEMPTS; attempt += 1) {
    const connecting = streamer.connect()
    try {
      await withOAuthHint(() =>
        waitFor(connecting, STREAMER_CONNECT_TIMEOUT_MS, 'Timed out connecting to dxLink streamer.')
      )
      return
    } catch (error) {
      lastError = error
      connecting.catch(() => undefined)
      await streamer.close().catch(() => undefined)
      if (attempt === STREAMER_CONNECT_ATTEMPTS || !isTransientWebSocketOpenError(error)) throw error
      await sleep(500)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

class LiveWebSocket implements WebSocketLike {
  private readonly socket: WebSocket
  private readonly opened: Promise<void>
  private readonly closed: Promise<void>
  private resolveClosed: () => void = () => undefined
  private open = false
  private closing = false
  private closedSettled = false
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: ((event: unknown) => void) | null = null
  onclose: ((event: unknown) => void) | null = null

  constructor(url: string) {
    this.socket = new WebSocket(url)
    this.opened = new Promise<void>((resolve, reject) => {
      let settled = false
      const settle = (fn: () => void): void => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        fn()
      }
      const timeout = setTimeout(() => {
        settle(() => {
          reject(new Error('Timed out opening WebSocket.'))
          this.socket.terminate()
        })
      }, 10_000)
      timeout.unref?.()
      this.socket.once('open', () => {
        settle(() => {
          this.open = true
          resolve()
        })
      })
      this.socket.once('error', (event) => {
        this.onerror?.(event)
        settle(() => reject(new Error('WebSocket failed to open.')))
      })
      this.socket.once('close', (code, reason) => {
        settle(() => reject(new Error(`WebSocket closed before opening (${code}: ${reason.toString()}).`)))
      })
    })
    this.closed = new Promise<void>((resolve) => {
      this.resolveClosed = resolve
    })
    this.socket.on('message', (data) => {
      this.onmessage?.({ data: websocketDataToString(data) })
    })
    this.socket.on('error', (event) => {
      this.onerror?.(event)
    })
    this.socket.on('close', (code, reason) => {
      this.open = false
      this.closedSettled = true
      this.onclose?.({ code, reason: reason.toString() })
      this.resolveClosed()
    })
  }

  async send(data: string): Promise<void> {
    if (!this.open) await this.opened
    if (this.closing || this.closedSettled) throw new Error('WebSocket is closed.')
    await new Promise<void>((resolve, reject) => {
      this.socket.send(data, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  async close(): Promise<void> {
    if (this.closedSettled) return
    this.closing = true
    this.opened.catch(() => undefined)
    this.socket.close()
    await waitFor(this.closed, 5_000, 'Timed out closing WebSocket.')
  }
}

function isTransientWebSocketOpenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return [
    'Timed out opening WebSocket.',
    'Timed out connecting to dxLink streamer.',
    'WebSocket failed to open.',
    'WebSocket closed before opening'
  ].some((message) => error.message.includes(message))
}

function sleep(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs)
    timeout.unref?.()
  })
}

function websocketDataToString(data: WebSocket.RawData): string {
  if (typeof data === 'string') return data
  if (Buffer.isBuffer(data)) return data.toString('utf8')
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8')
  return Buffer.from(data).toString('utf8')
}
