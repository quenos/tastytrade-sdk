export const NEW_YORK_TIME_ZONE = 'America/New_York'

export function nowInNewYork(): Date {
  return new Date()
}

export function todayInNewYork(): Date {
  return dateOnlyInNewYork(nowInNewYork())
}

export function isMarketOpenNow(now: Date = nowInNewYork()): boolean {
  const ny = getNewYorkParts(now)
  const day = new Date(Date.UTC(ny.year, ny.month - 1, ny.day))
  if (!isMarketOpenOn(day)) return false
  const minutes = ny.hour * 60 + ny.minute
  const close = isBlackFriday(day) ? 13 * 60 : 16 * 60
  return minutes >= 9 * 60 + 30 && minutes < close
}

export function isMarketOpenOn(day: Date = todayInNewYork()): boolean {
  return isBusinessDay(day)
}

export function getThirdFriday(day: Date = todayInNewYork()): Date {
  let cursor = utcDate(day.getUTCFullYear(), day.getUTCMonth(), 1 + 14)
  while (cursor.getUTCDay() !== 5) {
    cursor = addDays(cursor, 1)
  }
  return cursor
}

export function getTastyMonthly(day: Date = todayInNewYork()): Date {
  const exp1 = getThirdFriday(addDays(day, 28))
  const exp2 = getThirdFriday(addDays(day, 56))
  const day45 = addDays(day, 45)
  return diffDays(day45, exp1) < diffDays(exp2, day45) ? exp1 : exp2
}

export function getFutureFxMonthly(day: Date = todayInNewYork()): Date {
  let cursor = utcDate(day.getUTCFullYear(), day.getUTCMonth(), 8)
  while (cursor.getUTCDay() !== 3) cursor = addDays(cursor, 1)
  while (cursor.getUTCDay() !== 5) cursor = addDays(cursor, -1)
  return cursor
}

export function getFutureTreasuryMonthly(day: Date = todayInNewYork()): Date {
  const valid = validBusinessDaysInMonth(day)
  let cursor = addDays(valid[valid.length - 2]!, -1)
  while (cursor.getUTCDay() !== 5) cursor = addDays(cursor, -1)
  return valid.some((candidate) => sameDay(candidate, cursor)) ? cursor : addDays(cursor, -1)
}

export function getFutureMetalMonthly(day: Date = todayInNewYork()): Date {
  const valid = validBusinessDaysInMonth(day)
  const fourthLast = valid[valid.length - 4]!
  const nextDay = addDays(fourthLast, 1)
  if (fourthLast.getUTCDay() === 5 || !valid.some((candidate) => sameDay(candidate, nextDay))) {
    return valid[valid.length - 5]!
  }
  return fourthLast
}

export function getFutureGrainMonthly(day: Date = todayInNewYork()): Date {
  const valid = validBusinessDaysInMonth(day)
  let cursor = valid[valid.length - 3]!
  while (cursor.getUTCDay() !== 5) cursor = addDays(cursor, -1)
  return cursor
}

export function getFutureOilMonthly(day: Date = todayInNewYork()): Date {
  const twentyFifth = utcDate(day.getUTCFullYear(), day.getUTCMonth(), 25)
  const valid = validBusinessDaysBetween(utcDate(day.getUTCFullYear(), day.getUTCMonth(), 1), twentyFifth)
  return valid[valid.length - 7]!
}

export function getFutureIndexMonthly(day: Date = todayInNewYork()): Date {
  const valid = validBusinessDaysInMonth(day)
  return valid[valid.length - 1]!
}

export function ymd(day: Date): string {
  return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}-${String(
    day.getUTCDate()
  ).padStart(2, '0')}`
}

function validBusinessDaysInMonth(day: Date): Date[] {
  const start = utcDate(day.getUTCFullYear(), day.getUTCMonth(), 1)
  const end = utcDate(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)
  return validBusinessDaysBetween(start, end)
}

function validBusinessDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = []
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    if (isBusinessDay(cursor)) days.push(cursor)
  }
  return days
}

function isBusinessDay(day: Date): boolean {
  const dow = day.getUTCDay()
  if (dow === 0 || dow === 6) return false
  return !marketHolidaySet(day.getUTCFullYear()).has(ymd(day))
}

function marketHolidaySet(year: number): Set<string> {
  const holidays = [
    observedFixed(year, 0, 1),
    nthWeekday(year, 0, 1, 3),
    nthWeekday(year, 1, 1, 3),
    goodFriday(year),
    observedFixed(year, 5, 19),
    observedFixed(year, 6, 4),
    nthWeekday(year, 8, 1, 1),
    nthWeekday(year, 10, 4, 4),
    observedFixed(year, 11, 25)
  ]
  return new Set(holidays.map(ymd))
}

function observedFixed(year: number, month: number, day: number): Date {
  const date = utcDate(year, month, day)
  if (date.getUTCDay() === 0) return addDays(date, 1)
  if (date.getUTCDay() === 6) return addDays(date, -1)
  return date
}

function nthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  let date = utcDate(year, month, 1)
  while (date.getUTCDay() !== weekday) date = addDays(date, 1)
  return addDays(date, (nth - 1) * 7)
}

function goodFriday(year: number): Date {
  return addDays(easterSunday(year), -2)
}

function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return utcDate(year, month, day)
}

function isBlackFriday(day: Date): boolean {
  const thanksgiving = nthWeekday(day.getUTCFullYear(), 10, 4, 4)
  return sameDay(day, addDays(thanksgiving, 1))
}

function dateOnlyInNewYork(date: Date): Date {
  const parts = getNewYorkParts(date)
  return utcDate(parts.year, parts.month - 1, parts.day)
}

function getNewYorkParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NEW_YORK_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day))
}

function addDays(day: Date, days: number): Date {
  return utcDate(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + days)
}

function diffDays(left: Date, right: Date): number {
  return Math.abs(left.getTime() - right.getTime()) / 86_400_000
}

function sameDay(left: Date, right: Date): boolean {
  return ymd(left) === ymd(right)
}

export const now_in_new_york = nowInNewYork
export const today_in_new_york = todayInNewYork
export const is_market_open_now = isMarketOpenNow
export const is_market_open_on = isMarketOpenOn
export const get_third_friday = getThirdFriday
export const get_tasty_monthly = getTastyMonthly
export const get_future_fx_monthly = getFutureFxMonthly
export const get_future_treasury_monthly = getFutureTreasuryMonthly
export const get_future_metal_monthly = getFutureMetalMonthly
export const get_future_grain_monthly = getFutureGrainMonthly
export const get_future_oil_monthly = getFutureOilMonthly
export const get_future_index_monthly = getFutureIndexMonthly
