import { describe, expect, it } from 'vitest'
import { inMonths, periodLabel } from './dates'

describe('periodLabel', () => {
  it('names a single month', () => {
    expect(periodLabel(['2026-10'])).toBe('octobre 2026')
  })

  it('names a run of months, in any order', () => {
    expect(periodLabel(['2026-10', '2026-08', '2026-09'])).toBe('août à octobre 2026')
  })

  it('keeps both years when the run crosses new year', () => {
    expect(periodLabel(['2025-12', '2026-01'])).toBe('décembre 2025 à janvier 2026')
  })

  it('counts months with gaps between them', () => {
    expect(periodLabel(['2026-06', '2026-10'])).toBe('2 mois')
  })

  it('says every month when none is picked', () => {
    expect(periodLabel([])).toBe('tous les mois')
  })
})

describe('inMonths', () => {
  it('matches a date in a picked month', () => {
    expect(inMonths('2026-10-28', ['2026-09', '2026-10'])).toBe(true)
    expect(inMonths('2026-11-02', ['2026-09', '2026-10'])).toBe(false)
  })

  it('matches everything when no month is picked', () => {
    expect(inMonths('2020-01-01', [])).toBe(true)
  })
})
