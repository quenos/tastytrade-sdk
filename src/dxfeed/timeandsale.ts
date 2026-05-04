import { IndexedEvent, indexedFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class TimeAndSale extends IndexedEvent {
  declare index: number
  declare time: number
  declare time_nano_part: number
  declare sequence: number
  declare exchange_code: string
  declare price: DecimalValue
  declare size: number
  declare bid_price: DecimalValue
  declare ask_price: DecimalValue
  declare exchange_sale_conditions: string
  declare trade_through_exempt: string
  declare aggressor_side: string
  declare spread_leg: boolean
  declare extended_trading_hours: boolean
  declare valid_tick: boolean
  declare type: string
  declare buyer: null
  declare seller: null

  static override readonly fields: FieldDef[] = indexedFields(
    { name: 'index', kind: 'integer' },
    { name: 'time', kind: 'integer' },
    { name: 'time_nano_part', kind: 'integer' },
    { name: 'sequence', kind: 'integer' },
    { name: 'exchange_code', kind: 'string' },
    { name: 'price', kind: 'decimal' },
    { name: 'size', kind: 'integer' },
    { name: 'bid_price', kind: 'decimal' },
    { name: 'ask_price', kind: 'decimal' },
    { name: 'exchange_sale_conditions', kind: 'string' },
    { name: 'trade_through_exempt', kind: 'string' },
    { name: 'aggressor_side', kind: 'string' },
    { name: 'spread_leg', kind: 'boolean' },
    { name: 'extended_trading_hours', kind: 'boolean' },
    { name: 'valid_tick', kind: 'boolean' },
    { name: 'type', kind: 'string' },
    { name: 'buyer', kind: 'none' },
    { name: 'seller', kind: 'none' }
  )

  constructor(values: unknown[]) {
    super(values, TimeAndSale.fields)
  }
}
