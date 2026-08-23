/**
 * A stylised 360-day year: twelve 30-day months, four 90-day seasons. Real
 * calendars add complexity that a ten-year-old gains nothing from tracking,
 * while the seasonal cycle is the thing the game is actually about.
 */
export const DAYS_PER_MONTH = 30
export const MONTHS_PER_YEAR = 12
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR
export const DAYS_PER_SEASON = DAYS_PER_YEAR / 4

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const
export type Season = (typeof SEASONS)[number]

export const MONTH_NAMES = [
  'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December', 'January', 'February',
] as const

export interface CalendarDate {
  /** Day of the year, 0-359, where 0 is 1 March (the English new year in 1607). */
  dayOfYear: number
  /** Years elapsed since the scenario began. */
  year: number
  season: Season
  monthName: string
  /** Day within the month, 1-30. */
  dayOfMonth: number
}

export function seasonOf(dayOfYear: number): Season {
  const index = Math.floor(wrapDay(dayOfYear) / DAYS_PER_SEASON)
  return SEASONS[index] ?? 'spring'
}

function wrapDay(day: number): number {
  return ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR
}

/** Converts an absolute day count plus a scenario start offset into a date. */
export function dateFrom(startDay: number, elapsedDays: number): CalendarDate {
  const absolute = startDay + elapsedDays
  const dayOfYear = wrapDay(absolute)
  const monthIndex = Math.floor(dayOfYear / DAYS_PER_MONTH)
  return {
    dayOfYear,
    year: Math.floor(absolute / DAYS_PER_YEAR),
    season: seasonOf(dayOfYear),
    monthName: MONTH_NAMES[monthIndex] ?? 'March',
    dayOfMonth: (dayOfYear % DAYS_PER_MONTH) + 1,
  }
}

export function formatDate(date: CalendarDate): string {
  return `${date.dayOfMonth} ${date.monthName}`
}
