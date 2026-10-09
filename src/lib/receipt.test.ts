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
    expect(parseReceipt(text)).toEqual({ merchant: 'IGA', total: 12.05, date: '2026-10-08' })
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

  it('finds a known store even when the logo is read as noise', () => {
    const text = `Ee Ms rer —
~ 2 . ' ,
1200 BOUL. ST-JOSEPH
LAIT 2%           5,79
TOTAL            47,70
MERCI DE MAGASINER CHEZ SUPER C
superc.ca`
    expect(parseReceipt(text)).toMatchObject({ merchant: 'Super C', total: 47.7 })
  })

  it('picks the biggest confident header line for unknown stores', () => {
    const text = 'Ee Ms rer\nBoulangerie Ma Mie\nBienvenue\nTOTAL 8,50'
    const lines = [
      { text: 'Ee Ms rer', confidence: 30, height: 60 },
      { text: 'Boulangerie Ma Mie', confidence: 88, height: 40 },
      { text: 'Bienvenue', confidence: 92, height: 22 },
    ]
    expect(parseReceipt(text, lines).merchant).toBe('Boulangerie Ma Mie')
  })

  it('tidies an all-caps name', () => {
    expect(parseReceipt('FROMAGERIE DU MARCHE\nTOTAL 12,00').merchant).toBe('Fromagerie Du Marche')
  })

  it('ignores savings, tax totals and points around the real total', () => {
    const text = `SUPER C
POULET           12,99
FROMAGE           8,49
RABAIS           -2,00
SOUS-TOTAL       45,30
TPS               0,80
TVQ               1,60
TOTAL DES TAXES   2,40
TOTAL            47,70
DEBIT            47,70
ECONOMIES TOTALES 6,25
TOTAL POINTS     150,00`
    expect(parseReceipt(text).total).toBe(47.7)
  })

  it('trusts subtotal plus taxes when the TOTAL line is misread', () => {
    const text = `SOUS-TOTAL 45,30
TPS 0,80
TVQ 1,60
T0TAL 47,70
MONTANT DU 2,30
INTERAC 47,70`
    expect(parseReceipt(text).total).toBe(47.7)
  })
})
