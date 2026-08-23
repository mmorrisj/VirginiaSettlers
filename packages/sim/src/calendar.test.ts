import { describe, expect, it } from 'vitest'
import { DAYS_PER_YEAR, dateFrom, seasonOf } from './calendar.js'

describe('calendar', () => {
  it('divides the year into four equal seasons', () => {
    expect(seasonOf(0)).toBe('spring')
    expect(seasonOf(89)).toBe('spring')
    expect(seasonOf(90)).toBe('summer')
    expect(seasonOf(180)).toBe('autumn')
    expect(seasonOf(270)).toBe('winter')
    expect(seasonOf(359)).toBe('winter')
  })

  it('wraps around the year', () => {
    expect(seasonOf(DAYS_PER_YEAR)).toBe('spring')
    expect(seasonOf(-1)).toBe('winter')
  })

  it('counts years from the scenario start', () => {
    expect(dateFrom(120, 0).year).toBe(0)
    expect(dateFrom(120, 239).year).toBe(0)
    expect(dateFrom(120, 240).year).toBe(1)
  })

  it('names the month and day', () => {
    const date = dateFrom(120, 0)
    expect(date.monthName).toBe('July')
    expect(date.dayOfMonth).toBe(1)
    expect(date.season).toBe('summer')
  })
})
