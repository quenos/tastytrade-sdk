import { Event, baseFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class Quote extends Event {
  declare sequence: number
  declare time_nano_part: number
  declare bid_time: number
  declare bid_exchange_code: string
  declare ask_time: number
  declare ask_exchange_code: string
  declare bid_price: DecimalValue
  declare ask_price: DecimalValue
  declare bid_size: DecimalValue | null
  declare ask_size: DecimalValue | null

  static override readonly fields: FieldDef[] = baseFields(
    { name: 'sequence', kind: 'integer' },
    { name: 'time_nano_part', kind: 'integer' },
    { name: 'bid_time', kind: 'integer' },
    { name: 'bid_exchange_code', kind: 'string' },
    { name: 'ask_time', kind: 'integer' },
    { name: 'ask_exchange_code', kind: 'string' },
    { name: 'bid_price', kind: 'decimal' },
    { name: 'ask_price', kind: 'decimal' },
    { name: 'bid_size', kind: 'decimal', nullable: true },
    { name: 'ask_size', kind: 'decimal', nullable: true }
  )

  constructor(values: unknown[]) {
    super(values, Quote.fields)
  }
}
