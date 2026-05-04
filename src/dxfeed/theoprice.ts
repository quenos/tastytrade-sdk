import { IndexedEvent, indexedFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class TheoPrice extends IndexedEvent {
  declare index: number
  declare time: number
  declare sequence: number
  declare price: DecimalValue
  declare underlying_price: DecimalValue
  declare delta: DecimalValue
  declare gamma: DecimalValue
  declare dividend: DecimalValue
  declare interest: DecimalValue

  static override readonly fields: FieldDef[] = indexedFields(
    { name: 'index', kind: 'integer' },
    { name: 'time', kind: 'integer' },
    { name: 'sequence', kind: 'integer' },
    { name: 'price', kind: 'decimal' },
    { name: 'underlying_price', kind: 'decimal' },
    { name: 'delta', kind: 'decimal' },
    { name: 'gamma', kind: 'decimal' },
    { name: 'dividend', kind: 'decimal' },
    { name: 'interest', kind: 'decimal' }
  )

  constructor(values: unknown[]) {
    super(values, TheoPrice.fields)
  }
}
