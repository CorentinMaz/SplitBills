// Receipt image processing, no dependencies: find the paper, flatten it, clean it up for OCR.
// Works on plain pixel buffers so it can be unit-tested without a browser.

export type Point = { x: number; y: number }
/** Corners in order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point]
export type Pixels = { data: Uint8ClampedArray; width: number; height: number }

export function toGray({ data, width, height }: Pixels) {
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0; i < gray.length; i++) gray[i] = (data[i * 4] * 77 + data[i * 4 + 1] * 150 + data[i * 4 + 2] * 29) >> 8
  return gray
}

/** Threshold that best splits the histogram in two (paper vs background). */
export function otsu(gray: Uint8ClampedArray) {
  const hist = new Array<number>(256).fill(0)
  for (const v of gray) hist[v]++
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let best = 0
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (!wB) continue
    const wF = gray.length - wB
    if (!wF) break
    sumB += t * hist[t]
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2
    if (between > best) {
      best = between
      threshold = t
    }
  }
  return threshold
}

export function insetQuad(width: number, height: number, ratio = 0.06): Quad {
  const dx = width * ratio
  const dy = height * ratio
  return [
    { x: dx, y: dy },
    { x: width - dx, y: dy },
    { x: width - dx, y: height - dy },
    { x: dx, y: height - dy },
  ]
}

/**
 * Finds the receipt: the largest bright blob, then its four extreme corners.
 * Expects a small image (~500px). Returns null when nothing paper-like stands out.
 */
export function detectReceipt(img: Pixels): Quad | null {
  const { width, height } = img
  const gray = toGray(img)
  const t = otsu(gray)
  const bright = new Uint8Array(gray.length)
  for (let i = 0; i < gray.length; i++) bright[i] = gray[i] > t ? 1 : 0

  // Largest 4-connected bright component.
  const label = new Int32Array(gray.length)
  const stack = new Int32Array(gray.length)
  let bestLabel = 0
  let bestSize = 0
  let next = 0
  for (let start = 0; start < gray.length; start++) {
    if (!bright[start] || label[start]) continue
    next++
    let size = 0
    let top = 0
    stack[top++] = start
    label[start] = next
    while (top) {
      const i = stack[--top]
      size++
      const x = i % width
      const neighbours = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]
      for (const n of neighbours) {
        if (n < 0 || n >= gray.length || !bright[n] || label[n]) continue
        label[n] = next
        stack[top++] = n
      }
    }
    if (size > bestSize) {
      bestSize = size
      bestLabel = next
    }
  }
  const area = width * height
  // Too small is noise; nearly everything means a white table, where corners would be meaningless.
  if (bestSize < area * 0.05 || bestSize > area * 0.9) return null

  let tl = { s: Infinity, p: { x: 0, y: 0 } }
  let br = { s: -Infinity, p: { x: 0, y: 0 } }
  let tr = { s: -Infinity, p: { x: 0, y: 0 } }
  let bl = { s: Infinity, p: { x: 0, y: 0 } }
  for (let i = 0; i < gray.length; i++) {
    if (label[i] !== bestLabel) continue
    const x = i % width
    const y = (i - x) / width
    const sum = x + y
    const diff = x - y
    if (sum < tl.s) tl = { s: sum, p: { x, y } }
    if (sum > br.s) br = { s: sum, p: { x, y } }
    if (diff > tr.s) tr = { s: diff, p: { x, y } }
    if (diff < bl.s) bl = { s: diff, p: { x, y } }
  }
  return [tl.p, tr.p, br.p, bl.p]
}

/** Output size of the flattened receipt, from the quad's side lengths. */
export function quadSize(q: Quad) {
  const d = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
  return { width: Math.max(d(q[0], q[1]), d(q[3], q[2])), height: Math.max(d(q[0], q[3]), d(q[1], q[2])) }
}

/** Homography mapping the unit square's corners (0,0)(1,0)(1,1)(0,1) to the quad. */
function squareToQuad(q: Quad) {
  const [p0, p1, p2, p3] = q
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const sx = p0.x - p1.x + p2.x - p3.x
  const sy = p0.y - p1.y + p2.y - p3.y
  const den = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / den
  const h = (dx1 * sy - sx * dy1) / den
  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  }
}

/** Flattens the quad of `src` into a `width`×`height` grayscale image (bilinear sampling). */
export function warpGray(src: Pixels, q: Quad, width: number, height: number) {
  const gray = toGray(src)
  const m = squareToQuad(q)
  const out = new Uint8ClampedArray(width * height)
  const sw = src.width
  const sh = src.height
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width
      const w = m.g * u + m.h * v + 1
      const sxf = Math.min(sw - 1.001, Math.max(0, (m.a * u + m.b * v + m.c) / w))
      const syf = Math.min(sh - 1.001, Math.max(0, (m.d * u + m.e * v + m.f) / w))
      const x0 = sxf | 0
      const y0 = syf | 0
      const fx = sxf - x0
      const fy = syf - y0
      const i = y0 * sw + x0
      const top = gray[i] + (gray[i + 1] - gray[i]) * fx
      const bottom = gray[i + sw] + (gray[i + sw + 1] - gray[i + sw]) * fx
      out[y * width + x] = top + (bottom - top) * fy
    }
  }
  return out
}

/**
 * Dark text on white, whatever the lighting: each pixel is divided by its neighbourhood's mean,
 * so shadows and uneven paper vanish. Stays grayscale: hard black/white breaks the thin strokes
 * of faint thermal print, and Tesseract binarizes better on its own once the light is even.
 */
export function whiten(gray: Uint8ClampedArray, width: number, height: number) {
  const integral = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    let row = 0
    for (let x = 0; x < width; x++) {
      row += gray[y * width + x]
      integral[(y + 1) * (width + 1) + x + 1] = integral[y * (width + 1) + x + 1] + row
    }
  }
  const r = Math.max(8, Math.round(width / 30))
  const out = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(height, y + r + 1)
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(width, x + r + 1)
      const sum =
        integral[y1 * (width + 1) + x1] -
        integral[y0 * (width + 1) + x1] -
        integral[y1 * (width + 1) + x0] +
        integral[y0 * (width + 1) + x0]
      const mean = sum / ((x1 - x0) * (y1 - y0))
      // Paper sits at ~1, ink well below: stretch 0.55..0.95 to full black..white.
      const ratio = gray[y * width + x] / Math.max(1, mean)
      out[y * width + x] = ((ratio - 0.55) / 0.4) * 255
    }
  }
  return out
}
