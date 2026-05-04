import { versionStr } from './constants.js'
import { DecimalValue } from './decimal.js'
import {
  AccountBalance,
  CurrentPosition,
  TradingStatus,
} from './account.js'
import {
  Candle,
  Greeks,
  Profile,
  Quote,
  Summary,
  TheoPrice,
  TimeAndSale,
  Trade,
  Underlying,
  type Event
} from './dxfeed/index.js'
import { PlacedComplexOrder, PlacedOrder } from './order.js'
import { Session } from './session.js'
import { Watchlist } from './watchlists.js'
import {
  TastytradeError,
  camelize,
  intuitiveIterable,
  parseTastyObject,
  setSignFor,
  type JsonMap
} from './utils.js'

export const CERT_STREAMER_URL = 'wss://streamer.cert.tastyworks.com'
export const STREAMER_URL = 'wss://streamer.tastyworks.com'
export const DXLINK_VERSION = '0.1-DXF-JS/0.3.0'

export interface WebSocketLike {
  send(data: string): void | Promise<void>
  close(): void | Promise<void>
  onmessage: ((event: { data: string }) => void) | null
  onerror: ((event: unknown) => void) | null
  onclose: ((event: unknown) => void) | null
}

export type WebSocketFactory = (url: string) => WebSocketLike

export enum SubscriptionType {
  ACCOUNT = 'connect',
  HEARTBEAT = 'heartbeat',
  PUBLIC_WATCHLISTS = 'public-watchlists-subscribe',
  QUOTE_ALERTS = 'quote-alerts-subscribe'
}

export class AlertData {
  [key: string]: unknown
  data: JsonMap

  constructor(data: JsonMap, options: { decimalFields?: string[] } = {}) {
    this.data = parseTastyObject(data, options)
    Object.assign(this, this.data)
  }

  toJSON(): JsonMap {
    return this.data
  }
}

export { AccountBalance, CurrentPosition, TradingStatus } from './account.js'

export class QuoteAlert extends AlertData {
  declare threshold_numeric: DecimalValue | null

  constructor(data: JsonMap) {
    super(data, { decimalFields: ['threshold_numeric'] })
  }
}

export class ExternalTransaction extends AlertData {
  declare amount: DecimalValue | null

  constructor(data: JsonMap) {
    super(data, { decimalFields: ['amount'] })
  }
}

export class UnderlyingYearGainSummary extends AlertData {
  declare fees: DecimalValue | null
  declare commissions: DecimalValue | null
  declare yearly_realized_gain: DecimalValue | null
  declare realized_lot_gain: DecimalValue | null

  constructor(data: JsonMap) {
    super(setSignFor(data, ['fees', 'commissions', 'yearly_realized_gain', 'realized_lot_gain']), {
      decimalFields: ['fees', 'commissions', 'yearly_realized_gain', 'realized_lot_gain']
    })
  }
}

export const MAP_ALERTS = {
  AccountBalance,
  ComplexOrder: PlacedComplexOrder,
  ExternalTransaction,
  Order: PlacedOrder,
  CurrentPosition,
  QuoteAlert,
  TradingStatus,
  UnderlyingYearGainSummary,
  PublicWatchlists: Watchlist
}

export const MAP_ALERTS_REVERSE = new Map(
  Object.entries(MAP_ALERTS).map(([name, alertClass]) => [alertClass, name] as const)
)

export const MAP_EVENTS = {
  Candle,
  Greeks,
  Profile,
  Quote,
  Summary,
  TheoPrice,
  TimeAndSale,
  Trade,
  Underlying
}

export const MAP_EVENTS_REVERSE = new Map(Object.entries(MAP_EVENTS).map(([name, eventClass]) => [eventClass, name] as const))

type EventName = keyof typeof MAP_EVENTS
type EventClass<T extends Event = Event> = (typeof MAP_EVENTS)[EventName] & {
  fromStream(data: unknown[]): T[]
}
type AlertName = keyof typeof MAP_ALERTS
type AlertClass = (typeof MAP_ALERTS)[AlertName]
type Waiter = {
  resolve: () => void
  reject: (reason: unknown) => void
}

export class AsyncQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = []
  private readonly waiters: Array<(value: T) => void> = []

  push(value: T): void {
    const waiter = this.waiters.shift()
    if (waiter) waiter(value)
    else this.values.push(value)
  }

  async next(): Promise<T> {
    const value = this.values.shift()
    if (value !== undefined) return value
    return new Promise<T>((resolve) => this.waiters.push(resolve))
  }

  nextNowait(): T | null {
    return this.values.shift() ?? null
  }

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    while (true) yield await this.next()
  }
}

export class AlertStreamer {
  readonly session: Session
  base_url: string
  readonly webSocketFactory: WebSocketFactory
  request_id = 0
  websocket: WebSocketLike | null = null
  private readonly queues = new Map<string, AsyncQueue<unknown>>()

  constructor(session: Session, webSocketFactory: WebSocketFactory = defaultWebSocketFactory) {
    this.session = session
    this.base_url = session.is_test ? CERT_STREAMER_URL : STREAMER_URL
    this.webSocketFactory = webSocketFactory
  }

  connect(): void {
    this.websocket = this.webSocketFactory(this.base_url)
    this.websocket.onmessage = (event) => this.handleMessage(JSON.parse(event.data) as JsonMap)
  }

  async close(): Promise<void> {
    await this.websocket?.close()
    this.websocket = null
  }

  listen<T>(alertClass: { new (data: JsonMap): T }): AsyncIterable<T>
  listen(type: string): AsyncIterable<unknown>
  listen(alertClassOrType: AlertClass | string): AsyncIterable<unknown> {
    return this.queue(alertName(alertClassOrType))
  }

  async subscribeAccounts(accounts: Iterable<{ account_number: string }>): Promise<void> {
    await this._subscribe(
      SubscriptionType.ACCOUNT,
      Array.from(accounts).map((account) => account.account_number)
    )
  }

  async subscribe_accounts(accounts: Iterable<{ account_number: string }>): Promise<void> {
    await this.subscribeAccounts(accounts)
  }

  async subscribePublicWatchlists(): Promise<void> {
    await this._subscribe(SubscriptionType.PUBLIC_WATCHLISTS)
  }

  async subscribe_public_watchlists(): Promise<void> {
    await this.subscribePublicWatchlists()
  }

  async subscribeQuoteAlerts(): Promise<void> {
    await this._subscribe(SubscriptionType.QUOTE_ALERTS)
  }

  async subscribe_quote_alerts(): Promise<void> {
    await this.subscribeQuoteAlerts()
  }

  async heartbeat(): Promise<void> {
    await this._subscribe(SubscriptionType.HEARTBEAT)
  }

  handleMessage(message: JsonMap): void {
    const type = message.type
    if (typeof type !== 'string') return
    const alertClass = MAP_ALERTS[type as AlertName]
    const data = message.data
    if (alertClass && data && typeof data === 'object' && !Array.isArray(data)) {
      this.queue(type).push(new alertClass(data as JsonMap))
    }
  }

  async _subscribe(subscription: SubscriptionType, value?: string | string[]): Promise<void> {
    await this.session.refresh()
    this.request_id += 1
    const message: JsonMap = {
      'auth-token': `Bearer ${this.session.session_token}`,
      action: subscription,
      'request-id': this.request_id,
      source: versionStr
    }
    if (value) message.value = value
    await this.send(message)
  }

  private queue(type: string): AsyncQueue<unknown> {
    let queue = this.queues.get(type)
    if (!queue) {
      queue = new AsyncQueue<unknown>()
      this.queues.set(type, queue)
    }
    return queue
  }

  private async send(message: JsonMap): Promise<void> {
    if (!this.websocket) throw new TastytradeError('Streamer is not connected.')
    await this.websocket.send(JSON.stringify(message))
  }
}

export class DXLinkStreamer {
  readonly session: Session
  readonly webSocketFactory: WebSocketFactory
  websocket: WebSocketLike | null = null
  private authToken = ''
  private wssUrl = ''
  private authenticated = false
  private readonly sendQueues = new Map<string, AsyncQueue<Event>>()
  private readonly channels = new Map<EventName, number>()
  private readonly channelsReversed = new Map<number, EventName>()
  private readonly opened = new Set<EventName>()
  private readonly authWaiters = new Set<Waiter>()
  private readonly openWaiters = new Map<EventName, Array<() => void>>()
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  constructor(session: Session, webSocketFactory: WebSocketFactory = defaultWebSocketFactory) {
    this.session = session
    this.webSocketFactory = webSocketFactory
    let index = 0
    for (const name of Object.keys(MAP_EVENTS) as EventName[]) {
      const channel = index * 2 + 1
      this.channels.set(name, channel)
      this.channelsReversed.set(channel, name)
      this.sendQueues.set(name, new AsyncQueue<Event>())
      index += 1
    }
  }

  async connect(): Promise<void> {
    await this.session.refresh()
    if (!this.session.dxlink_url || !this.session.streamer_token || Date.now() / 1000 >= this.session.streamer_expiration - 60) {
      await this.session.refreshStreamerToken()
    }
    this.wssUrl = this.session.dxlink_url
    this.authToken = this.session.streamer_token
    this.authenticated = false
    this.websocket = this.webSocketFactory(this.wssUrl)
    this.websocket.onmessage = (event) => this.handleMessage(JSON.parse(event.data) as JsonMap)
    const authorized = this.waitForAuthorized()
    try {
      await this.sendSetup()
      await authorized
    } catch (error) {
      this.rejectAuthWaiters(error)
      await authorized.catch(() => undefined)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    await this.websocket?.close()
    this.websocket = null
  }

  async subscribe(eventClass: EventClass, symbols: Iterable<string> | string, refreshInterval = 0.1): Promise<void> {
    const eventType = eventName(eventClass)
    if (!this.opened.has(eventType)) {
      await this.channelRequest(eventType, refreshInterval)
    }
    await this.send({
      type: 'FEED_SUBSCRIPTION',
      channel: this.channel(eventType),
      add: Array.from(intuitiveIterable(symbols)).map((symbol) => ({ symbol, type: eventType }))
    })
  }

  async unsubscribe(eventClass: EventClass, symbols: Iterable<string> | string): Promise<void> {
    const eventType = eventName(eventClass)
    await this.send({
      type: 'FEED_SUBSCRIPTION',
      channel: this.channel(eventType),
      remove: Array.from(intuitiveIterable(symbols)).map((symbol) => ({ symbol, type: eventType }))
    })
  }

  async unsubscribeAll(eventClass: EventClass): Promise<void> {
    await this.send({ type: 'CHANNEL_CANCEL', channel: this.channel(eventName(eventClass)) })
  }

  async unsubscribe_all(eventClass: EventClass): Promise<void> {
    await this.unsubscribeAll(eventClass)
  }

  async subscribeCandle(
    symbols: Iterable<string> | string,
    interval: string,
    startTime?: Date,
    extendedTradingHours = false,
    refreshInterval = 0.1
  ): Promise<void> {
    if (!this.opened.has('Candle')) {
      await this.channelRequest('Candle', refreshInterval)
      this.opened.add('Candle')
    }
    const fromTime = Math.round(startTime ? startTime.getTime() : 1e9)
    await this.send({
      type: 'FEED_SUBSCRIPTION',
      channel: this.channel('Candle'),
      add: Array.from(intuitiveIterable(symbols)).map((ticker) => ({
        symbol: extendedTradingHours ? `${ticker}{=${interval}}` : `${ticker}{=${interval},tho=true}`,
        type: 'Candle',
        fromTime
      }))
    })
  }

  async subscribe_candle(
    symbols: Iterable<string> | string,
    interval: string,
    startTime: Date,
    extendedTradingHours = false,
    refreshInterval = 0.1
  ): Promise<void> {
    await this.subscribeCandle(symbols, interval, startTime, extendedTradingHours, refreshInterval)
  }

  async unsubscribeCandle(ticker: string, interval: string | null = null, extendedTradingHours = false): Promise<void> {
    await this.send({
      type: 'FEED_SUBSCRIPTION',
      channel: this.channel('Candle'),
      remove: [
        {
          symbol: extendedTradingHours ? `${ticker}{=${interval}}` : `${ticker}{=${interval},tho=true}`,
          type: 'Candle'
        }
      ]
    })
  }

  async unsubscribe_candle(ticker: string, interval: string | null = null, extendedTradingHours = false): Promise<void> {
    await this.unsubscribeCandle(ticker, interval, extendedTradingHours)
  }

  listen<T extends Event>(eventClass: EventClass<T>): AsyncIterable<T> {
    return this.queue(eventName(eventClass)) as unknown as AsyncQueue<T>
  }

  async getEvent<T extends Event>(eventClass: EventClass<T>): Promise<T> {
    return (await this.queue(eventName(eventClass)).next()) as T
  }

  async get_event<T extends Event>(eventClass: EventClass<T>): Promise<T> {
    return this.getEvent(eventClass)
  }

  getEventNowait<T extends Event>(eventClass: EventClass<T>): T | null {
    return this.queue(eventName(eventClass)).nextNowait() as T | null
  }

  get_event_nowait<T extends Event>(eventClass: EventClass<T>): T | null {
    return this.getEventNowait(eventClass)
  }

  handleMessage(message: JsonMap): void | Promise<void> {
    if (message.type === 'FEED_DATA') {
      this.mapMessage(message.data as unknown[])
    } else if (message.type === 'SETUP') {
      return this.authenticateConnection()
    } else if (message.type === 'AUTH_STATE') {
      this.authenticated = message.state === 'AUTHORIZED'
      if (this.authenticated) {
        void this.startHeartbeat()
        this.resolveAuthWaiters()
      }
    } else if (message.type === 'CHANNEL_OPENED') {
      const eventType = this.channelsReversed.get(Number(message.channel))
      if (eventType) {
        this.opened.add(eventType)
        this.resolveOpenWaiters(eventType)
      }
    } else if (message.type === 'CHANNEL_CLOSED') {
      const eventType = this.channelsReversed.get(Number(message.channel))
      if (eventType) this.opened.delete(eventType)
    } else if (message.type === 'FEED_CONFIG' || message.type === 'KEEPALIVE') {
      return
    } else if (message.type === 'ERROR') {
      const error = new TastytradeError(`Fatal streamer error: ${String(message.message)}`)
      this.rejectAuthWaiters(error)
      throw error
    }
  }

  private mapMessage(message: unknown[]): void {
    const msgType = Array.isArray(message[0]) ? String(message[0][0]) : String(message[0])
    const data = message[1] as unknown[]
    if (!(msgType in MAP_EVENTS)) return
    const eventClass = MAP_EVENTS[msgType as EventName] as EventClass
    for (const event of eventClass.fromStream(data)) {
      this.queue(msgType as EventName).push(event)
    }
  }

  private async sendSetup(): Promise<void> {
    await this.send({
      type: 'SETUP',
      channel: 0,
      keepaliveTimeout: 60,
      acceptKeepaliveTimeout: 60,
      version: DXLINK_VERSION
    })
  }

  async _setup_connection(): Promise<void> {
    await this.sendSetup()
  }

  private async authenticateConnection(): Promise<void> {
    await this.send({ type: 'AUTH', channel: 0, token: this.authToken })
  }

  async _authenticate_connection(): Promise<void> {
    await this.authenticateConnection()
  }

  private async channelRequest(eventType: EventName, refreshInterval: number): Promise<void> {
    await this.send({
      type: 'CHANNEL_REQUEST',
      channel: this.channel(eventType),
      service: 'FEED',
      parameters: { contract: 'AUTO' }
    })
    await this.waitForChannelOpened(eventType)
    await this.channelSetup(eventType, refreshInterval)
  }

  private async channelSetup(eventType: EventName, refreshInterval: number): Promise<void> {
    await this.send({
      type: 'FEED_SETUP',
      channel: this.channel(eventType),
      acceptAggregationPeriod: refreshInterval,
      acceptDataFormat: 'COMPACT',
      acceptEventFields: { [eventType]: MAP_EVENTS[eventType].fields.map((field) => camelize(field.name)) }
    })
  }

  async _channel_request(eventType: EventName, refreshInterval = 0.1): Promise<void> {
    await this.channelRequest(eventType, refreshInterval)
  }

  async _channel_setup(eventType: EventName, refreshInterval = 0.1): Promise<void> {
    await this.channelSetup(eventType, refreshInterval)
  }

  private async startHeartbeat(): Promise<void> {
    if (this.heartbeatTimer) return
    const sendKeepalive = async () => {
      if (!this.websocket) return
      await this.send({ type: 'KEEPALIVE', channel: 0 })
    }
    await sendKeepalive()
    this.heartbeatTimer = setInterval(() => {
      void sendKeepalive()
    }, 30_000)
    this.heartbeatTimer.unref?.()
  }

  async _heartbeat(): Promise<void> {
    await this.startHeartbeat()
  }

  private async waitForAuthorized(): Promise<void> {
    if (this.authenticated) return
    await new Promise<void>((resolve, reject) => {
      let waiter: Waiter
      const timeout = setTimeout(() => {
        this.authWaiters.delete(waiter)
        reject(new TastytradeError('Streamer authorization not completed'))
      }, 10_000)
      timeout.unref?.()
      waiter = {
        resolve: () => {
          clearTimeout(timeout)
          this.authWaiters.delete(waiter)
          resolve()
        },
        reject: (reason: unknown) => {
          clearTimeout(timeout)
          this.authWaiters.delete(waiter)
          reject(reason)
        }
      }
      this.authWaiters.add(waiter)
    })
  }

  private resolveAuthWaiters(): void {
    const waiters = Array.from(this.authWaiters)
    this.authWaiters.clear()
    for (const waiter of waiters) waiter.resolve()
  }

  private rejectAuthWaiters(reason: unknown): void {
    const waiters = Array.from(this.authWaiters)
    this.authWaiters.clear()
    for (const waiter of waiters) waiter.reject(reason)
  }

  private async waitForChannelOpened(eventType: EventName): Promise<void> {
    if (this.opened.has(eventType)) return
    await new Promise<void>((resolve, reject) => {
      const waiters = this.openWaiters.get(eventType) ?? []
      const timeout = setTimeout(() => {
        const current = this.openWaiters.get(eventType) ?? []
        this.openWaiters.set(
          eventType,
          current.filter((item) => item !== waiter)
        )
        reject(new TastytradeError('Subscription channel not opened'))
      }, 10_000)
      timeout.unref?.()
      const waiter = () => {
        clearTimeout(timeout)
        resolve()
      }
      waiters.push(waiter)
      this.openWaiters.set(eventType, waiters)
    })
  }

  private resolveOpenWaiters(eventType: EventName): void {
    const waiters = this.openWaiters.get(eventType) ?? []
    this.openWaiters.delete(eventType)
    for (const waiter of waiters) waiter()
  }

  private queue(eventType: EventName): AsyncQueue<Event> {
    return this.sendQueues.get(eventType)!
  }

  private channel(eventType: EventName): number {
    return this.channels.get(eventType)!
  }

  private async send(message: JsonMap): Promise<void> {
    if (!this.websocket) throw new TastytradeError('Streamer is not connected.')
    await this.websocket.send(JSON.stringify(message))
  }
}

function eventName(eventClass: EventClass): EventName {
  return (MAP_EVENTS_REVERSE.get(eventClass) ?? eventClass.name) as EventName
}

function alertName(alertClassOrType: AlertClass | string): string {
  if (typeof alertClassOrType === 'string') return alertClassOrType
  return MAP_ALERTS_REVERSE.get(alertClassOrType) ?? alertClassOrType.name
}

function defaultWebSocketFactory(url: string): WebSocketLike {
  const WebSocketCtor = (globalThis as unknown as { WebSocket?: new (url: string) => WebSocketLike }).WebSocket
  if (!WebSocketCtor) {
    throw new TastytradeError('No WebSocket implementation available. Pass a WebSocket factory.')
  }
  return new WebSocketCtor(url)
}
