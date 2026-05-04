import { Event, baseFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class Profile extends Event {
  declare description: string
  declare short_sale_restriction: string
  declare trading_status: string
  declare halt_start_time: number
  declare halt_end_time: number
  declare ex_dividend_day_id: number
  declare status_reason: string | null
  declare high_52_week_price: DecimalValue | null
  declare low_52_week_price: DecimalValue | null
  declare beta: DecimalValue | null
  declare shares: DecimalValue | null
  declare high_limit_price: DecimalValue | null
  declare low_limit_price: DecimalValue | null
  declare earnings_per_share: DecimalValue | null
  declare ex_dividend_amount: DecimalValue | null
  declare dividend_frequency: DecimalValue | null
  declare free_float: DecimalValue | null

  static override readonly fields: FieldDef[] = baseFields(
    { name: 'description', kind: 'string' },
    { name: 'short_sale_restriction', kind: 'string' },
    { name: 'trading_status', kind: 'string' },
    { name: 'halt_start_time', kind: 'integer' },
    { name: 'halt_end_time', kind: 'integer' },
    { name: 'ex_dividend_day_id', kind: 'integer' },
    { name: 'status_reason', kind: 'string', nullable: true },
    { name: 'high_52_week_price', kind: 'decimal', nullable: true },
    { name: 'low_52_week_price', kind: 'decimal', nullable: true },
    { name: 'beta', kind: 'decimal', nullable: true },
    { name: 'shares', kind: 'decimal', nullable: true },
    { name: 'high_limit_price', kind: 'decimal', nullable: true },
    { name: 'low_limit_price', kind: 'decimal', nullable: true },
    { name: 'earnings_per_share', kind: 'decimal', nullable: true },
    { name: 'ex_dividend_amount', kind: 'decimal', nullable: true },
    { name: 'dividend_frequency', kind: 'decimal', nullable: true },
    { name: 'free_float', kind: 'decimal', nullable: true }
  )

  constructor(values: unknown[]) {
    super(values, Profile.fields)
  }
}
