import { parseReceipt, type OcrLine } from './receipt'
import { detectReceipt, insetQuad, quadSize, warpGray, whiten, type Quad } from './scan'

/** The photo, capped so phones don't run out of memory on 50 MP pictures. */
export async function loadPhoto(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas
}

/** Where the receipt is in the photo; a slightly inset frame when it can't tell. */
export function findReceipt(photo: HTMLCanvasElement): { quad: Quad; found: boolean } {
  const scale = Math.min(1, 500 / Math.max(photo.width, photo.height))
  const small = document.createElement('canvas')
  small.width = Math.round(photo.width * scale)
  small.height = Math.round(photo.height * scale)
  const ctx = small.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(photo, 0, 0, small.width, small.height)
  const quad = detectReceipt(ctx.getImageData(0, 0, small.width, small.height))
  if (!quad) return { quad: insetQuad(photo.width, photo.height, 0.04), found: false }
  return { quad: quad.map((p) => ({ x: p.x / scale, y: p.y / scale })) as Quad, found: true }
}

/** Flattened, evenly lit receipt, about 1200px wide: the size Tesseract reads receipts best at. */
export function flatten(photo: HTMLCanvasElement, quad: Quad) {
  const size = quadSize(quad)
  const scale = Math.min(2, 1200 / size.width)
  const width = Math.round(size.width * scale)
  const height = Math.min(9000, Math.round(size.height * scale))
  const src = photo.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, photo.width, photo.height)
  const clean = whiten(warpGray(src, quad, width, height), width, height)

  const out = document.createElement('canvas')
  out.width = width
  out.height = height
  const rgba = new ImageData(width, height)
  for (let i = 0; i < clean.length; i++) rgba.data.set([clean[i], clean[i], clean[i], 255], i * 4)
  out.getContext('2d')!.putImageData(rgba, 0, 0)
  return out
}

export async function readReceipt(image: HTMLCanvasElement, onProgress?: (p: number) => void) {
  const { createWorker, PSM } = await import('tesseract.js')
  const worker = await createWorker(['fra', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  try {
    // One column of lines: keeps "TOTAL ..... 47,70" on a single line instead of splitting columns.
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })
    const { data } = await worker.recognize(image, {}, { text: true, blocks: true })
    const lines: OcrLine[] = (data.blocks ?? [])
      .flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
      .map((l) => ({ text: l.text.trim(), confidence: l.confidence, height: l.bbox.y1 - l.bbox.y0 }))
      .filter((l) => l.text)
    return { text: data.text, ...parseReceipt(data.text, lines) }
  } finally {
    await worker.terminate()
  }
}
