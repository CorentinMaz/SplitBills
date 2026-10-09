/** An OCR line with what Tesseract knows about it: big, confident text is likely the store name. */
export type OcrLine = { text: string; confidence: number; height: number }

export type ParsedReceipt = {
  merchant?: string
  total?: number
  /** Every plausible total, most likely first: shown as one-tap choices when the scan guesses wrong. */
  amounts: number[]
  date?: string
}

const AMOUNT = /(\d{1,5}(?:[ ,.]\d{3})*[.,]\d{2})(?!\d)/g
const TOTAL_WORDS = /\b(total|montant|a payer|à payer|amount due|balance due|grand total)\b/i
// Stems, not words: "ÉCONOMIES TOTALES", "TOTAL DES TAXES", "TOTAL POINTS" must not win.
const NOT_TOTAL_WORDS =
  /sous[- ]?total|sub[- ]?total|\b(tps|tvq|tvh|gst|qst|hst)\b|tax|rabais|[ée]conomi|[ée]pargn|\bsav(ed|ings?)\b|\bchange\b|monnaie|remis|\bpoints?\b|articles?|\bitems?\b/i
const SUBTOTAL_WORDS = /sous[- ]?total|sub[- ]?total/i
const TAX_WORDS = /\b(tps|tvq|tvh|gst|qst|hst|taxes?)\b/i
const PAYMENT_WORDS = /\b(visa|master ?card|amex|d[ée]bit|interac|comptant|cash|paiement|payment|cr[ée]dit|carte)\b/i

function toNumber(raw: string) {
  // Last separator is the decimal one; anything before it is a thousands separator.
  const cleaned = raw.replace(/[ ,.](?=\d{3}(?:[ ,.]|$))/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : undefined
}

/** Common OCR slips inside prices: "47,7O" -> "47,70", "47 ,70" -> "47,70", "47. 70" -> "47.70". */
export function fixDigits(line: string) {
  return line
    .replace(/(\d)[Oo]|[Oo](?=\d)/g, (_, d) => (d ? `${d}0` : '0'))
    .replace(/(\d) ?([.,]) ?(\d{2})(?!\d)/g, '$1$2$3')
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

// Logos are often images, so the store name is missing or garbled; its name or website usually shows up elsewhere.
const MERCHANTS: [string, RegExp][] = [
  ['Super C', /\bsuper ?c\b/],
  ['Maxi', /\bmaxi\b(?! ?mum)/],
  ['IGA', /\biga\b/],
  ['Metro', /\bmetro\b/],
  ['Provigo', /\bprovigo\b/],
  ['Loblaws', /\bloblaws?\b/],
  ['Costco', /\bcostco\b/],
  ['Walmart', /\bwal ?mart\b/],
  ['Dollarama', /\bdollarama\b/],
  ['Adonis', /\badonis\b/],
  ['Avril', /\bavril (?:supermarche|sante)\b/],
  ['Marché Tau', /\bmarche tau\b/],
  ['Rachelle-Béry', /\brachelle ?bery\b/],
  ['Jean Coutu', /\bjean ?coutu\b/],
  ['Pharmaprix', /\bpharmaprix\b/],
  ['Shoppers Drug Mart', /\bshoppers drug mart\b/],
  ['Uniprix', /\buniprix\b/],
  ['Familiprix', /\bfamiliprix\b/],
  ['Brunet', /\bbrunet\b/],
  ['Proxim', /\bproxim\b/],
  ['SAQ', /\bsaq\b/],
  ['Couche-Tard', /\bcouche ?tard\b/],
  ['Canadian Tire', /\bcanadian ?tire\b/],
  ['Home Depot', /\bhome ?depot\b/],
  ['Rona', /\brona\b/],
  ['Réno-Dépôt', /\breno ?depot\b/],
  ['BMR', /\bbmr\b/],
  ['Bureau en Gros', /\bbureau en gros\b/],
  ['IKEA', /\bikea\b/],
  ['Winners', /\bwinners\b/],
  ['Simons', /\bsimons\b/],
  ['Sports Experts', /\bsports? experts\b/],
  ['Best Buy', /\bbest ?buy\b/],
  ['Tigre Géant', /\btigre geant\b|\bgiant tiger\b/],
  ['Tim Hortons', /\btim ?hortons?\b/],
  ['Starbucks', /\bstarbucks\b/],
  ["McDonald's", /\bmc ?donald ?s?\b/],
  ['St-Hubert', /\bst ?hubert\b/],
  ['Subway', /\bsubway\b/],
  ['A&W', /\ba ?& ?w\b|\ba ?et ?w\b/],
  ['Pizza Pizza', /\bpizza pizza\b/],
  ['Petro-Canada', /\bpetro ?canada\b/],
  ['Ultramar', /\bultramar\b/],
  ['Esso', /\besso\b/],
  ['Shell', /\bshell\b/],
  ['Pétro-T', /\bpetro ?t\b/],
]

/** Lowercase, no accents, punctuation as spaces: "SUPER-C.ca" -> "super c ca". */
function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9&]+/g, ' ')
}

function knownMerchant(text: string) {
  const norm = normalize(text)
  let best: { name: string; at: number } | undefined
  for (const [name, re] of MERCHANTS) {
    const at = norm.search(re)
    if (at >= 0 && (!best || at < best.at)) best = { name, at }
  }
  return best?.name
}

const NOT_MERCHANT = /\b(bienvenue|welcome|merci|thank|facture|re[cç]u|receipt|caissi|cashier|transaction|client|magasin|store|tel|t[ée]l[ée]phone|www|http|rue|street|avenue|boul|blvd|chemin|qc|quebec|québec)\b/i

/** A line that reads like a name: mostly letters, a real word, no prices, dates or addresses. */
function looksLikeName(line: string) {
  const chars = line.replace(/\s/g, '')
  const letters = (chars.match(/[a-zà-ÿ]/gi) ?? []).length
  return (
    chars.length >= 3 &&
    letters / chars.length >= 0.7 &&
    /[a-zà-ÿ]{3,}/i.test(line) &&
    amountsIn(line).length === 0 &&
    !/\d{3}[-. ]\d{4}/.test(line) &&
    !NOT_MERCHANT.test(line)
  )
}

/** "SUPER MARCHE BOB" -> "Super Marche Bob"; mixed case is left as typed. */
function tidy(name: string) {
  const clean = name.replace(/[^\p{L}\p{N}&' -]/gu, '').replace(/\s+/g, ' ').trim()
  if (clean !== clean.toUpperCase()) return clean
  return clean.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase())
}

function guessMerchant(lines: string[], ocrLines?: OcrLine[]) {
  // Only the header: past that it's items. Low-confidence lines are usually a logo read as noise.
  if (ocrLines?.length) {
    const header = ocrLines.slice(0, 8).filter((l) => l.confidence >= 60 && looksLikeName(l.text))
    // The store name is usually printed bigger than the rest.
    const biggest = header.reduce<OcrLine | undefined>((a, l) => (!a || l.height > a.height * 1.15 ? l : a), undefined)
    if (biggest) return tidy(biggest.text)
  }
  const line = lines.slice(0, 8).find(looksLikeName)
  return line && tidy(line)
}

/** Last amount on the line, or on the next one: OCR often splits label and amount. */
function amountAt(lines: string[], i: number) {
  const here = amountsIn(lines[i])
  const amounts = here.length ? here : amountsIn(lines[i + 1] ?? '')
  return amounts.at(-1)
}

function amountsWhere(lines: string[], test: (line: string) => boolean) {
  return lines.flatMap((l, i) => (test(l) ? [amountAt(lines, i)] : [])).filter((n): n is number => n !== undefined)
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.015

function findTotals(lines: string[]) {
  const all = lines.flatMap(amountsIn)
  const subtotal = amountsWhere(lines, (l) => SUBTOTAL_WORDS.test(l)).at(-1)
  const labelled = amountsWhere(lines, (l) => TOTAL_WORDS.test(l) && !NOT_TOTAL_WORDS.test(l))
  const paid = amountsWhere(lines, (l) => PAYMENT_WORDS.test(l))

  let total: number | undefined
  // Best proof: subtotal + taxes, when that sum is printed somewhere.
  const taxes = amountsWhere(lines, (l) => TAX_WORDS.test(l) && !/total/i.test(l))
  if (subtotal !== undefined && taxes.length) {
    const expected = subtotal + taxes.reduce((a, b) => a + b, 0)
    total = all.find((n) => near(n, expected))
  }
  // Else a vote: the total is printed several times (TOTAL, DEBIT, MONTANT), and OCR rarely
  // misreads every copy the same way. Ties go to the card or cash line: it's what was charged.
  if (total === undefined) {
    const votes = [...labelled, ...paid]
    const count = (n: number) => votes.filter((v) => near(v, n)).length
    const best = Math.max(0, ...votes.map(count))
    const tied = votes.filter((n) => count(n) === best)
    total = tied.find((n) => paid.some((p) => near(p, n))) ?? tied.at(-1)
  }
  if (total === undefined && all.length) total = Math.max(...all)

  // Item prices only make sense as choices when no subtotal anchors the bottom of the receipt.
  const fallback = subtotal === undefined ? all.toSorted((a, b) => b - a) : []
  const ranked = [total, ...labelled.toReversed(), ...paid, subtotal, ...fallback]
  const amounts: number[] = []
  for (const n of ranked) if (n !== undefined && n > 0 && !amounts.some((a) => near(a, n))) amounts.push(n)
  return { total, amounts: amounts.slice(0, 6) }
}

export function parseReceipt(text: string, ocrLines?: OcrLine[]): ParsedReceipt {
  const lines = text.split('\n').map((l) => fixDigits(l.trim())).filter(Boolean)

  const merchant = knownMerchant(text) ?? guessMerchant(lines, ocrLines)

  return { merchant, ...findTotals(lines), date: parseDate(lines.join('\n')) }
}
