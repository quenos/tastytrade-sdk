import { IndexedEvent, indexedFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class Candle extends IndexedEvent {
  declare index: number
  declare time: number
  declare sequence: number
  declare count: number
  declare volume: DecimalValue | null
  declare vwap: DecimalValue | null
  declare bid_volume: DecimalValue | null
  declare ask_volume: DecimalValue | null
  declare imp_volatility: DecimalValue | null
  declare open_interest: number | null
  declare open: DecimalValue
  declare high: DecimalValue
  declare low: DecimalValue
  declare close: DecimalValue

  static override readonly fields: FieldDef[] = indexedFields(
    { name: 'index', kind: 'integer' },
    { name: 'time', kind: 'integer' },
    { name: 'sequence', kind: 'integer' },
    { name: 'count', kind: 'integer' },
    { name: 'volume', kind: 'decimal', nullable: true },
    { name: 'vwap', kind: 'decimal', nullable: true },
    { name: 'bid_volume', kind: 'decimal', nullable: true },
    { name: 'ask_volume', kind: 'decimal', nullable: true },
    { name: 'imp_volatility', kind: 'decimal', nullable: true },
    { name: 'open_interest', kind: 'integer', nullable: true },
    { name: 'open', kind: 'decimal', zeroIfMissing: true },
    { name: 'high', kind: 'decimal', zeroIfMissing: true },
    { name: 'low', kind: 'decimal', zeroIfMissing: true },
    { name: 'close', kind: 'decimal', zeroIfMissing: true }
  )

  constructor(values: unknown[]) {
    super(values, Candle.fields)
  }
}
