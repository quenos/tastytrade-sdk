export type DecimalInput = DecimalValue | string | number | bigint

const DECIMAL_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

export class DecimalValue {
  readonly value: string

  constructor(value: DecimalInput) {
    if (value instanceof DecimalValue) {
      this.value = value.value
      return
    }
    const raw = String(value)
    if (!DECIMAL_RE.test(raw)) {
      throw new TypeError(`Invalid decimal value: ${raw}`)
    }
    this.value = normalizeDecimal(raw)
  }

  static from(value: DecimalInput | null | undefined): DecimalValue | null {
    if (value === null || value === undefined) return null
    return new DecimalValue(value)
  }

  abs(): DecimalValue {
    return new DecimalValue(this.value.startsWith('-') ? this.value.slice(1) : this.value)
  }

  isNegative(): boolean {
    return this.value.startsWith('-') && this.value !== '0'
  }

  toString(): string {
    return this.value
  }

  toJSON(): string {
    return this.value
  }

  valueOf(): number {
    return Number(this.value)
  }
}

export function decimal(value: DecimalInput): DecimalValue {
  return new DecimalValue(value)
}

function normalizeDecimal(raw: string): string {
  if (!/[eE]/.test(raw)) {
    return normalizePlain(raw)
  }

  const [coefficient = '0', exponentPart = '0'] = raw.split(/[eE]/)
  const exponent = Number(exponentPart)
  if (!Number.isInteger(exponent)) {
    throw new TypeError(`Invalid decimal exponent: ${raw}`)
  }

  const sign = coefficient.startsWith('-') ? '-' : coefficient.startsWith('+') ? '' : ''
  const unsigned = coefficient.replace(/^[+-]/, '')
  const [integer = '0', fraction = ''] = unsigned.split('.')
  const digits = `${integer}${fraction}`.replace(/^0+(?=\d)/, '')
  const point = integer.length + exponent

  if (point <= 0) {
    return normalizePlain(`${sign}0.${'0'.repeat(Math.abs(point))}${digits}`)
  }
  if (point >= digits.length) {
    return normalizePlain(`${sign}${digits}${'0'.repeat(point - digits.length)}`)
  }
  return normalizePlain(`${sign}${digits.slice(0, point)}.${digits.slice(point)}`)
}

function normalizePlain(raw: string): string {
  const sign = raw.startsWith('-') ? '-' : ''
  const unsigned = raw.replace(/^[+-]/, '')
  const [integerPart = '0', fractionPart] = unsigned.split('.')
  const integer = integerPart.replace(/^0+(?=\d)/, '') || '0'
  const fraction = fractionPart
  const normalized = fraction ? `${integer}.${fraction}` : integer
  return normalized === '0' ? '0' : `${sign}${normalized}`
}
