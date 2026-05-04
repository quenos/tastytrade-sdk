import { InstrumentType } from './order.js'
import { Session } from './session.js'
import { parseTastyObject, toApiObject, type JsonMap } from './utils.js'

export interface PairInput {
  left_action: string
  left_symbol: string
  left_quantity: number
  right_action: string
  right_symbol: string
  right_quantity: number
}

export class Pair {
  [key: string]: unknown
  left_action: string
  left_symbol: string
  left_quantity: number
  right_action: string
  right_symbol: string
  right_quantity: number
  data: JsonMap

  constructor(data: JsonMap | PairInput) {
    this.data = parseTastyObject(data as JsonMap)
    Object.assign(this, this.data)
    this.left_action = String(this.data.left_action)
    this.left_symbol = String(this.data.left_symbol)
    this.left_quantity = Number(this.data.left_quantity)
    this.right_action = String(this.data.right_action)
    this.right_symbol = String(this.data.right_symbol)
    this.right_quantity = Number(this.data.right_quantity)
  }

  toJSON(): PairInput {
    return {
      left_action: this.left_action,
      left_symbol: this.left_symbol,
      left_quantity: this.left_quantity,
      right_action: this.right_action,
      right_symbol: this.right_symbol,
      right_quantity: this.right_quantity
    }
  }
}

export class PairsWatchlist {
  [key: string]: unknown
  name: string
  order_index: number
  pairs_equations: Pair[]
  data: JsonMap

  constructor(data: JsonMap) {
    this.data = parseTastyObject(data)
    Object.assign(this, this.data)
    this.name = String(this.data.name)
    this.order_index = Number(this.data.order_index)
    this.pairs_equations = ((this.data.pairs_equations as JsonMap[] | undefined) ?? []).map((pair) => new Pair(pair))
  }

  static async get(session: Session): Promise<PairsWatchlist[]>
  static async get(session: Session, name: string): Promise<PairsWatchlist>
  static async get(session: Session, name?: string): Promise<PairsWatchlist | PairsWatchlist[]> {
    if (name) {
      return new PairsWatchlist(await session._get(`/pairs-watchlists/${name}`))
    }
    const data = await session._get('/pairs-watchlists')
    return items(data).map((item) => new PairsWatchlist(item))
  }

  static async a_get(session: Session): Promise<PairsWatchlist[]>
  static async a_get(session: Session, name: string): Promise<PairsWatchlist>
  static async a_get(session: Session, name?: string): Promise<PairsWatchlist | PairsWatchlist[]> {
    return name ? PairsWatchlist.get(session, name) : PairsWatchlist.get(session)
  }
}

export interface WatchlistEntry {
  symbol: string
  instrument_type: InstrumentType | string
}

export interface WatchlistInput {
  name: string
  watchlist_entries?: Array<WatchlistEntry | JsonMap> | null
  group_name?: string
  order_index?: number
}

export class Watchlist {
  [key: string]: unknown
  name: string
  watchlist_entries: Array<WatchlistEntry | JsonMap> | null
  group_name: string
  order_index: number
  data: JsonMap

  constructor(data: JsonMap | WatchlistInput) {
    this.data = parseTastyObject(data as JsonMap)
    Object.assign(this, this.data)
    this.name = String(this.data.name)
    this.watchlist_entries = (this.data.watchlist_entries as Array<WatchlistEntry | JsonMap> | null | undefined) ?? null
    this.group_name = String(this.data.group_name ?? 'default')
    this.order_index = Number(this.data.order_index ?? 9999)
  }

  toJSON(): WatchlistInput {
    return {
      name: this.name,
      watchlist_entries: this.watchlist_entries,
      group_name: this.group_name,
      order_index: this.order_index
    }
  }

  toApiJSON(): string {
    return JSON.stringify(toApiObject(this.toJSON(), { byAlias: true }))
  }
}

export class PublicWatchlist extends Watchlist {
  static async get(session: Session, options?: { counts_only?: boolean }): Promise<PublicWatchlist[]>
  static async get(session: Session, name: string): Promise<PublicWatchlist>
  static async get(
    session: Session,
    nameOrOptions?: string | { counts_only?: boolean },
    options: { counts_only?: boolean } = {}
  ): Promise<PublicWatchlist | PublicWatchlist[]> {
    if (typeof nameOrOptions === 'string') {
      return new PublicWatchlist(await session._get(`/public-watchlists/${nameOrOptions}`))
    }
    const countsOnly = nameOrOptions?.counts_only ?? options.counts_only ?? false
    const data = await session._get('/public-watchlists', { params: { 'counts-only': countsOnly } })
    return items(data).map((item) => new PublicWatchlist(item))
  }

  static async a_get(session: Session, options?: { counts_only?: boolean }): Promise<PublicWatchlist[]>
  static async a_get(session: Session, name: string): Promise<PublicWatchlist>
  static async a_get(
    session: Session,
    nameOrOptions?: string | { counts_only?: boolean },
    options: { counts_only?: boolean } = {}
  ): Promise<PublicWatchlist | PublicWatchlist[]> {
    if (typeof nameOrOptions === 'string') return PublicWatchlist.get(session, nameOrOptions)
    return PublicWatchlist.get(session, nameOrOptions ?? options)
  }
}

export class PrivateWatchlist extends Watchlist {
  static async get(session: Session): Promise<PrivateWatchlist[]>
  static async get(session: Session, name: string): Promise<PrivateWatchlist>
  static async get(session: Session, name?: string): Promise<PrivateWatchlist | PrivateWatchlist[]> {
    if (name) {
      return new PrivateWatchlist(await session._get(`/watchlists/${name}`))
    }
    const data = await session._get('/watchlists')
    return items(data).map((item) => new PrivateWatchlist(item))
  }

  static async a_get(session: Session): Promise<PrivateWatchlist[]>
  static async a_get(session: Session, name: string): Promise<PrivateWatchlist>
  static async a_get(session: Session, name?: string): Promise<PrivateWatchlist | PrivateWatchlist[]> {
    return name ? PrivateWatchlist.get(session, name) : PrivateWatchlist.get(session)
  }

  static async remove(session: Session, name: string): Promise<void> {
    await session._delete(`/watchlists/${name}`)
  }

  static async a_remove(session: Session, name: string): Promise<void> {
    await PrivateWatchlist.remove(session, name)
  }

  async upload(session: Session): Promise<void> {
    await session._post('/watchlists', { body: this.toApiJSON() })
  }

  async a_upload(session: Session): Promise<void> {
    await this.upload(session)
  }

  async update(session: Session): Promise<void> {
    await session._put(`/watchlists/${this.name}`, { body: this.toApiJSON() })
  }

  async a_update(session: Session): Promise<void> {
    await this.update(session)
  }

  addSymbol(symbol: string, instrumentType: InstrumentType): void {
    if (this.watchlist_entries === null) {
      this.watchlist_entries = []
    }
    this.watchlist_entries.push({ symbol, instrument_type: instrumentType })
  }

  add_symbol(symbol: string, instrumentType: InstrumentType): void {
    this.addSymbol(symbol, instrumentType)
  }

  removeSymbol(symbol: string, instrumentType: InstrumentType): void {
    if (this.watchlist_entries === null) return
    const index = this.watchlist_entries.findIndex(
      (entry) => entry.symbol === symbol && entry.instrument_type === instrumentType
    )
    if (index === -1) throw new Error(`Watchlist entry not found: ${symbol} ${instrumentType}`)
    this.watchlist_entries.splice(index, 1)
  }

  remove_symbol(symbol: string, instrumentType: InstrumentType): void {
    this.removeSymbol(symbol, instrumentType)
  }
}

export async function getPairsWatchlists(session: Session): Promise<PairsWatchlist[]> {
  const data = await session._get('/pairs-watchlists')
  return items(data).map((item) => new PairsWatchlist(item))
}

export const get_pairs_watchlists = getPairsWatchlists
export const a_get_pairs_watchlists = getPairsWatchlists

export async function getPairsWatchlist(session: Session, name: string): Promise<PairsWatchlist> {
  return new PairsWatchlist(await session._get(`/pairs-watchlists/${name}`))
}

export const get_pairs_watchlist = getPairsWatchlist
export const a_get_pairs_watchlist = getPairsWatchlist

export async function getPublicWatchlists(session: Session, counts_only = false): Promise<PublicWatchlist[]> {
  const data = await session._get('/public-watchlists', { params: { 'counts-only': counts_only } })
  return items(data).map((item) => new PublicWatchlist(item))
}

export const get_public_watchlists = getPublicWatchlists
export const a_get_public_watchlists = getPublicWatchlists

export async function getPublicWatchlist(session: Session, name: string): Promise<PublicWatchlist> {
  return new PublicWatchlist(await session._get(`/public-watchlists/${name}`))
}

export const get_public_watchlist = getPublicWatchlist
export const a_get_public_watchlist = getPublicWatchlist

export async function getPrivateWatchlists(session: Session): Promise<PrivateWatchlist[]> {
  const data = await session._get('/watchlists')
  return items(data).map((item) => new PrivateWatchlist(item))
}

export const get_private_watchlists = getPrivateWatchlists
export const a_get_private_watchlists = getPrivateWatchlists

export async function getPrivateWatchlist(session: Session, name: string): Promise<PrivateWatchlist> {
  return new PrivateWatchlist(await session._get(`/watchlists/${name}`))
}

export const get_private_watchlist = getPrivateWatchlist
export const a_get_private_watchlist = getPrivateWatchlist

export async function createPrivateWatchlist(session: Session, watchlist: JsonMap): Promise<JsonMap> {
  return parseTastyObject(await session._post('/watchlists', { body: JSON.stringify(toApiObject(watchlist, { byAlias: true })) }))
}

export const create_private_watchlist = createPrivateWatchlist
export const a_create_private_watchlist = createPrivateWatchlist

export async function updatePrivateWatchlist(session: Session, name: string, watchlist: JsonMap): Promise<JsonMap> {
  return parseTastyObject(
    await session._put(`/watchlists/${name}`, {
      body: JSON.stringify(toApiObject(watchlist, { byAlias: true }))
    })
  )
}

export const update_private_watchlist = updatePrivateWatchlist
export const a_update_private_watchlist = updatePrivateWatchlist

export async function deletePrivateWatchlist(session: Session, name: string): Promise<void> {
  await session._delete(`/watchlists/${name}`)
}

export const delete_private_watchlist = deletePrivateWatchlist
export const a_delete_private_watchlist = deletePrivateWatchlist

function items(data: JsonMap): JsonMap[] {
  return (data.items as JsonMap[] | undefined) ?? []
}
