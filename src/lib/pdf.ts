import type { OcrLine } from './receipt'

/** Receipts are short: the rest of a long PDF is terms and ads. */
const MAX_PAGES = 3

export function isPdf(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

/**
 * A digital receipt: its pages stacked into one image (kept with the expense), and its text
 * lines when the PDF has a text layer. No text means a scanned PDF, which still needs the OCR.
 */
export async function loadPdf(file: File) {
  const pdfjs = await import('pdfjs-dist')
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const doc = await task.promise
    const pages: HTMLCanvasElement[] = []
    const lines: OcrLine[] = []
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n)
      // ~1200px wide: the size Tesseract reads best at, should the PDF have no text layer.
      const viewport = page.getViewport({ scale: 1200 / page.getViewport({ scale: 1 }).width })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await page.render({ canvas, viewport }).promise
      pages.push(canvas)
      lines.push(...textLines((await page.getTextContent()).items))
    }

    const image = document.createElement('canvas')
    image.width = pages[0].width
    image.height = Math.min(9000, pages.reduce((h, p) => h + p.height, 0))
    const ctx = image.getContext('2d')!
    let y = 0
    for (const p of pages) {
      ctx.drawImage(p, 0, y)
      y += p.height
    }
    return { image, lines }
  } finally {
    await task.destroy()
  }
}

type TextItem = { str: string; transform: number[]; height: number }

/** PDF text comes as loose runs: put back together the ones sharing a baseline, left to right. */
function textLines(items: readonly object[]): OcrLine[] {
  const runs = items
    .filter((i): i is TextItem => 'str' in i && !!(i as TextItem).str.trim())
    .map((i) => ({ text: i.str, x: i.transform[4], y: i.transform[5], height: i.height }))
    .sort((a, b) => b.y - a.y || a.x - b.x)

  const lines: { y: number; height: number; runs: typeof runs }[] = []
  for (const run of runs) {
    const line = lines.at(-1)
    if (line && Math.abs(line.y - run.y) < Math.max(line.height, run.height) / 2) {
      line.runs.push(run)
      line.height = Math.max(line.height, run.height)
    } else lines.push({ y: run.y, height: run.height, runs: [run] })
  }
  return lines.map((l) => ({
    text: l.runs
      .sort((a, b) => a.x - b.x)
      .map((r) => r.text.trim())
      .join(' '),
    // Real text, not a guess: as sure as it gets.
    confidence: 100,
    height: l.height,
  }))
}
