import { describe, expect, it } from 'vitest'
import { rebalanceShares } from './shares'

const ids = ['a', 'b', 'c']
const total = (s: Record<string, number>) => Object.values(s).reduce((x, y) => x + y, 0)

describe('rebalanceShares', () => {
  it('gives the rest to the other one with two members', () => {
    expect(rebalanceShares({ a: 50, b: 50 }, ['a', 'b'], 'a', 70)).toEqual({ a: 70, b: 30 })
  })

  it('keeps the proportions between the others', () => {
    expect(rebalanceShares({ a: 20, b: 60, c: 20 }, ids, 'a', 40)).toEqual({ a: 40, b: 45, c: 15 })
  })

  it('splits evenly when the others were at 0', () => {
    expect(rebalanceShares({ a: 100, b: 0, c: 0 }, ids, 'a', 40)).toEqual({ a: 40, b: 30, c: 30 })
  })

  it('always lands on 100 despite rounding', () => {
    for (let v = 0; v <= 100; v++) expect(total(rebalanceShares({ a: 33, b: 33, c: 34 }, ids, 'b', v))).toBe(100)
  })

  it('clamps and ignores garbage', () => {
    expect(rebalanceShares({ a: 50, b: 50 }, ['a', 'b'], 'a', 150)).toEqual({ a: 100, b: 0 })
    expect(rebalanceShares({ a: 50, b: 50 }, ['a', 'b'], 'a', NaN)).toEqual({ a: 0, b: 100 })
  })
})
