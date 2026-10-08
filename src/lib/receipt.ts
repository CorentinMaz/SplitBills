export type ParsedReceipt = {
  merchant?: string
  total?: number
  date?: string
}

const AMOUNT = /(\d{1,5}(?:[ ,.]\d{3})*[.,]\d{2})(?!\d)/g
const TOTAL_WORDS = /\b(total|montant|a payer|à payer|amount due|balance due|grand total)\b/i
const NOT_TOTAL_WORDS = /\b(sous[- ]?total|sub[- ]?total|tps|tvq|tvh|gst|qst|hst|tax|taxe|rabais|economie|économie|change|monnaie|remise)\b/i

function toNumber(raw: string) {
  // Last separator is the decimal one; anything before it is a thousands separator.
  const cleaned = raw.replace(/[ ,.](?=\d{3}(?:[ ,.]|$))/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

function amountsIn(line: string) {
  return [...line.matchAll(AMOUNT)].map((m) => toNumber(m[1])).filter((n): n is number => n !== undefined)
}

function parseDate(text: string) {
  const iso = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/)
  if (iso) return fmt(+iso[1], +iso[2], +iso[3])
  // Canadian receipts are usually DD/MM/YY(YY); fall back to MM/DD when the day slot can't be a month.
  const dmy = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/)
  if (dmy) {
    let [a, b] = [+dmy[1], +dmy[2]]
    const year = dmy[3].length === 2 ? 2000 + +dmy[3] : +dmy[3]
    if (b > 12 && a <= 12) [a, b] = [b, a]
    return fmt(year, b, a)
  }
  return undefined
}

function fmt(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function parseReceipt(text: string): ParsedReceipt {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const merchant = lines.find((l) => /[a-zà-ÿ]{3,}/i.test(l) && amountsIn(l).length === 0)

  let total: number | undefined
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (!TOTAL_WORDS.test(line) || NOT_TOTAL_WORDS.test(line)) continue
    // The amount is sometimes on the next line in OCR output.
    const amounts = amountsIn(line).length ? amountsIn(line) : amountsIn(lines[i + 1] ?? '')
    if (amounts.length) {
      total = amounts[amounts.length - 1]
      break
    }
  }
  if (total === undefined) {
    const all = lines.flatMap(amountsIn)
    if (all.length) total = Math.max(...all)
  }

  return { merchant, total, date: parseDate(text) }
}
