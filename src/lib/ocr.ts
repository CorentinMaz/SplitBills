import { parseReceipt } from './receipt'

/** Downscale and grayscale before OCR: much faster on phones and usually more accurate. */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.filter = 'grayscale(1) contrast(1.4)'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function scanReceipt(file: File, onProgress?: (p: number) => void) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(['fra', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(await prepare(file))
    return { text: data.text, ...parseReceipt(data.text) }
  } finally {
    await worker.terminate()
  }
}
