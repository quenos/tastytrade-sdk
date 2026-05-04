import { Event, baseFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class Trade extends Event {
  declare time: number
  declare time_nano_part: number
  declare sequence: number
  declare exchange_code: string
  declare day_id: number
  declare tick_direction: string
  declare extended_trading_hours: boolean
  declare price: DecimalValue
  declare change: DecimalValue | null
  declare size: number | null
  declare day_volume: DecimalValue | null
  declare day_turnover: DecimalValue | null

  static override readonly fields: FieldDef[] = baseFields(
    { name: 'time', kind: 'integer' },
    { name: 'time_nano_part', kind: 'integer' },
    { name: 'sequence', kind: 'integer' },
    { name: 'exchange_code', kind: 'string' },
    { name: 'day_id', kind: 'integer' },
    { name: 'tick_direction', kind: 'string' },
    { name: 'extended_trading_hours', kind: 'boolean' },
    { name: 'price', kind: 'decimal' },
    { name: 'change', kind: 'decimal', nullable: true },
    { name: 'size', kind: 'integer', nullable: true },
    { name: 'day_volume', kind: 'decimal', nullable: true },
    { name: 'day_turnover', kind: 'decimal', nullable: true }
  )

  constructor(values: unknown[]) {
    super(values, Trade.fields)
  }
}
