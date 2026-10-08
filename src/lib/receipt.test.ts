import { describe, expect, it } from 'vitest'
import { parseReceipt } from './receipt'

describe('parseReceipt', () => {
  it('reads a Quebec grocery receipt', () => {
    const text = `IGA EXTRA
1234 RUE ST-DENIS
08/10/2026 14:32
LAIT 2% 4L        6,49
PAIN              3,99
SOUS-TOTAL       10,48
TPS               0,52
TVQ               1,05
TOTAL            12,05
VISA             12,05`
    expect(parseReceipt(text)).toEqual({ merchant: 'IGA EXTRA', total: 12.05, date: '2026-10-08' })
  })

  it('handles thousands separators and amount on next line', () => {
    const text = `Best Buy
2026-03-15
Montant total
1 249,99`
    expect(parseReceipt(text)).toMatchObject({ total: 1249.99, date: '2026-03-15' })
  })

  it('falls back to the largest amount', () => {
    expect(parseReceipt('Cafe\n4.50\n2.25').total).toBe(4.5)
  })
})
