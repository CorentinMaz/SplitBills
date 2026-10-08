import { describe, expect, it } from 'vitest'
import type { Entry } from '../types'
import { computeBalances, settleUp } from './balance'

const base = { createdBy: 'a', createdAt: 0, date: '2026-10-08' }
const expense = (amount: number, paidBy: string, shares: Record<string, number>): Entry => ({
  ...base, id: String(Math.random()), kind: 'expense', title: 'x', amount, paidBy, shares,
})

describe('computeBalances', () => {
  it('splits 70/30 when A pays', () => {
    const b = computeBalances(['a', 'b'], [expense(100, 'a', { a: 70, b: 30 })])
    expect(b).toEqual({ a: 30, b: -30 })
  })

  it('splits 70/30 when B pays', () => {
    const b = computeBalances(['a', 'b'], [expense(100, 'b', { a: 70, b: 30 })])
    expect(b).toEqual({ a: -70, b: 70 })
  })

  it('payments clear the debt', () => {
    const b = computeBalances(['a', 'b'], [
      expense(100, 'a', { a: 70, b: 30 }),
      { ...base, id: 'p', kind: 'payment', amount: 30, paidBy: 'b', to: 'a' },
    ])
    expect(b).toEqual({ a: 0, b: 0 })
  })
})

describe('settleUp', () => {
  it('produces one transfer for two people', () => {
    expect(settleUp({ a: 30, b: -30 })).toEqual([{ from: 'b', to: 'a', amount: 30 }])
  })

  it('handles three people', () => {
    const t = settleUp({ a: 50, b: -20, c: -30 })
    expect(t).toEqual([{ from: 'c', to: 'a', amount: 30 }, { from: 'b', to: 'a', amount: 20 }])
  })
})
