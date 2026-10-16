/** Longest the stored data URL may be: Firestore documents are capped at 1 MiB. */
export const MAX_RECEIPT_CHARS = 700_000

/**
 * The flattened receipt as a JPEG data URL small enough for one Firestore document.
 * Starts at a comfortable reading size and lowers quality, then width, until it fits.
 */
export function receiptToJpeg(image: HTMLCanvasElement, maxChars = MAX_RECEIPT_CHARS) {
  let width = Math.min(image.width, 900)
  for (;;) {
    const scale = width / image.width
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.round(image.height * scale)
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.7, 0.55, 0.4]) {
      const url = canvas.toDataURL('image/jpeg', quality)
      if (url.length <= maxChars) return url
    }
    if (width <= 300) return canvas.toDataURL('image/jpeg', 0.3)
    width = Math.round(width * 0.7)
  }
}
