import { IndexedEvent, indexedFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class Underlying extends IndexedEvent {
  declare index: number
  declare time: number
  declare sequence: number
  declare volatility: DecimalValue
  declare front_volatility: DecimalValue
  declare back_volatility: DecimalValue
  declare call_volume: number
  declare put_volume: number
  declare option_volume: number
  declare put_call_ratio: DecimalValue

  static override readonly fields: FieldDef[] = indexedFields(
    { name: 'index', kind: 'integer' },
    { name: 'time', kind: 'integer' },
    { name: 'sequence', kind: 'integer' },
    { name: 'volatility', kind: 'decimal' },
    { name: 'front_volatility', kind: 'decimal' },
    { name: 'back_volatility', kind: 'decimal' },
    { name: 'call_volume', kind: 'integer' },
    { name: 'put_volume', kind: 'integer' },
    { name: 'option_volume', kind: 'integer' },
    { name: 'put_call_ratio', kind: 'decimal' }
  )

  constructor(values: unknown[]) {
    super(values, Underlying.fields)
  }
}
