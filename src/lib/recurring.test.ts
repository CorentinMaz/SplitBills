import { describe, expect, it } from 'vitest'
import { dueMonths, nextMonth, occurrenceDate } from './recurring'

describe('occurrenceDate', () => {
  it('uses the day as is when the month has it', () => {
    expect(occurrenceDate('2026-10', 1)).toBe('2026-10-01')
  })

  it('falls back to the last day of short months', () => {
    expect(occurrenceDate('2026-11', 31)).toBe('2026-11-30')
    expect(occurrenceDate('2027-02', 30)).toBe('2027-02-28')
    expect(occurrenceDate('2028-02', 30)).toBe('2028-02-29')
  })
})

describe('dueMonths', () => {
  const rent = { day: 1, startMonth: '2026-11', lastMonth: null }

  it('adds the first month once its day has come', () => {
    expect(dueMonths(rent, '2026-11-09')).toEqual(['2026-11'])
    expect(dueMonths({ ...rent, day: 15 }, '2026-11-09')).toEqual([])
  })

  it('never adds a month twice', () => {
    expect(dueMonths({ ...rent, lastMonth: '2026-11' }, '2026-11-30')).toEqual([])
    expect(dueMonths({ ...rent, lastMonth: '2026-11' }, '2026-12-01')).toEqual(['2026-12'])
  })

  it('catches up every month missed while nobody opened the app', () => {
    expect(dueMonths({ ...rent, lastMonth: '2026-11' }, '2027-02-01')).toEqual(['2026-12', '2027-01', '2027-02'])
  })

  it('waits for a start month in the future', () => {
    expect(dueMonths({ ...rent, startMonth: '2027-01' }, '2026-12-15')).toEqual([])
  })
})

describe('nextMonth', () => {
  it('starts at the start month', () => {
    expect(nextMonth({ startMonth: '2026-11', lastMonth: null })).toBe('2026-11')
  })

  it('goes on after the last month added', () => {
    expect(nextMonth({ startMonth: '2026-11', lastMonth: '2027-01' })).toBe('2027-02')
  })

  it('jumps to a start moved later', () => {
    expect(nextMonth({ startMonth: '2027-06', lastMonth: '2027-01' })).toBe('2027-06')
  })
})
