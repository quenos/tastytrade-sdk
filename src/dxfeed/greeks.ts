import { IndexedEvent, indexedFields, type FieldDef } from './event.js'
import type { DecimalValue } from '../decimal.js'

export class Greeks extends IndexedEvent {
  declare index: number
  declare time: number
  declare sequence: number
  declare price: DecimalValue
  declare volatility: DecimalValue
  declare delta: DecimalValue
  declare gamma: DecimalValue
  declare theta: DecimalValue
  declare rho: DecimalValue
  declare vega: DecimalValue

  static override readonly fields: FieldDef[] = indexedFields(
    { name: 'index', kind: 'integer' },
    { name: 'time', kind: 'integer' },
    { name: 'sequence', kind: 'integer' },
    { name: 'price', kind: 'decimal' },
    { name: 'volatility', kind: 'decimal' },
    { name: 'delta', kind: 'decimal' },
    { name: 'gamma', kind: 'decimal' },
    { name: 'theta', kind: 'decimal' },
    { name: 'rho', kind: 'decimal' },
    { name: 'vega', kind: 'decimal' }
  )

  constructor(values: unknown[]) {
    super(values, Greeks.fields)
  }
}
