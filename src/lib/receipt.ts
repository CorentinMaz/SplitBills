/** An OCR line with what Tesseract knows about it: big, confident text is likely the store name. */
export type OcrLine = { text: string; confidence: number; height: number }

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

export function parseReceipt(text: string, ocrLines?: OcrLine[]): ParsedReceipt {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  const merchant = knownMerchant(text) ?? guessMerchant(lines, ocrLines)

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
