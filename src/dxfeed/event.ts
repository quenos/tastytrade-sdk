import { DecimalValue } from '../decimal.js'
import { TastytradeError, camelize } from '../utils.js'

export const TX_PENDING = 0x1
export const REMOVE_EVENT = 0x2
export const SNAPSHOT_BEGIN = 0x4
export const SNAPSHOT_END = 0x8
export const SNAPSHOT_SNIP = 0x10
export const SNAPSHOT_MODE = 0x40

export type FieldKind = 'string' | 'integer' | 'number' | 'decimal' | 'boolean' | 'none' | 'unknown'

export interface FieldDef {
  name: string
  kind: FieldKind
  nullable?: boolean
  zeroIfMissing?: boolean
}

export abstract class Event {
  static readonly fields: FieldDef[] = [
    { name: 'event_symbol', kind: 'string' },
    { name: 'event_time', kind: 'integer' }
  ]

  declare event_symbol: string
  declare event_time: number

  static fromStream<T extends Event>(this: EventConstructor<T>, data: unknown[]): T[] {
    const objs: T[] = []
    const size = this.fields.length
    const multiples = data.length / size
    if (!Number.isInteger(multiples)) {
      throw new TastytradeError('Mapper data input values are not a multiple of the key size!')
    }
    for (let i = 0; i < multiples; i += 1) {
      const values = data.slice(i * size, (i + 1) * size)
      try {
        objs.push(new this(values))
      } catch {
        // tastyware skips invalid event chunks because dxFeed sometimes emits unhelpful partials.
      }
    }
    return objs
  }

  protected constructor(values: unknown[], fields: FieldDef[]) {
    fields.forEach((field, index) => {
      ;(this as unknown as Record<string, unknown>)[field.name] = parseField(values[index], field)
    })
  }
}

export abstract class IndexedEvent extends Event {
  declare event_flags: number

  get pending(): boolean {
    return (this.event_flags & TX_PENDING) !== 0
  }

  get remove(): boolean {
    return (this.event_flags & REMOVE_EVENT) !== 0
  }

  get snapshot_begin(): boolean {
    return (this.event_flags & SNAPSHOT_BEGIN) !== 0
  }

  get snapshot_end(): boolean {
    return (this.event_flags & SNAPSHOT_END) !== 0
  }

  get snapshot_mode(): boolean {
    return (this.event_flags & SNAPSHOT_MODE) !== 0
  }

  get snapshot_snip(): boolean {
    return (this.event_flags & SNAPSHOT_SNIP) !== 0
  }
}

export function baseFields(...fields: FieldDef[]): FieldDef[] {
  return [...Event.fields, ...fields]
}

export function indexedFields(...fields: FieldDef[]): FieldDef[] {
  return [...Event.fields, { name: 'event_flags', kind: 'integer' }, ...fields]
}

export function toCamelEventObject(event: Event): Record<string, unknown> {
  return Object.fromEntries(Object.entries(event).map(([key, value]) => [camelize(key), value]))
}

interface EventConstructor<T extends Event> {
  readonly fields: FieldDef[]
  new (values: unknown[]): T
}

function parseField(value: unknown, field: FieldDef): unknown {
  if (field.kind === 'none') {
    if (value !== null) throw new TypeError(`Invalid ${field.name}`)
    return null
  }
  if (value === 'NaN' || value === 'Infinity' || value === '-Infinity') {
    if (field.zeroIfMissing) return new DecimalValue(0)
    if (field.nullable) return null
    throw new TypeError(`Invalid ${field.name}`)
  }
  if (value === null || value === undefined) {
    if (field.zeroIfMissing) return new DecimalValue(0)
    if (field.nullable) return null
    throw new TypeError(`Missing ${field.name}`)
  }
  switch (field.kind) {
    case 'string':
      if (typeof value !== 'string') throw new TypeError(`Invalid ${field.name}`)
      return value
    case 'integer': {
      const number = Number(value)
      if (!Number.isInteger(number)) throw new TypeError(`Invalid ${field.name}`)
      return number
    }
    case 'number': {
      const number = Number(value)
      if (!Number.isFinite(number)) throw new TypeError(`Invalid ${field.name}`)
      return number
    }
    case 'decimal':
      return new DecimalValue(value as string | number)
    case 'boolean':
      if (typeof value !== 'boolean') throw new TypeError(`Invalid ${field.name}`)
      return value
    case 'unknown':
      return value
  }
}
