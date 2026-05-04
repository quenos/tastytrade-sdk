import { Event, baseFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class Summary extends Event {
  declare day_id: number
  declare day_close_price_type: string
  declare prev_day_id: number
  declare prev_day_close_price_type: string
  declare open_interest: number
  declare day_open_price: DecimalValue | null
  declare day_high_price: DecimalValue | null
  declare day_low_price: DecimalValue | null
  declare day_close_price: DecimalValue | null
  declare prev_day_close_price: DecimalValue | null
  declare prev_day_volume: DecimalValue | null

  static override readonly fields: FieldDef[] = baseFields(
    { name: 'day_id', kind: 'integer' },
    { name: 'day_close_price_type', kind: 'string' },
    { name: 'prev_day_id', kind: 'integer' },
    { name: 'prev_day_close_price_type', kind: 'string' },
    { name: 'open_interest', kind: 'integer' },
    { name: 'day_open_price', kind: 'decimal', nullable: true },
    { name: 'day_high_price', kind: 'decimal', nullable: true },
    { name: 'day_low_price', kind: 'decimal', nullable: true },
    { name: 'day_close_price', kind: 'decimal', nullable: true },
    { name: 'prev_day_close_price', kind: 'decimal', nullable: true },
    { name: 'prev_day_volume', kind: 'decimal', nullable: true }
  )

  constructor(values: unknown[]) {
    super(values, Summary.fields)
  }
}
