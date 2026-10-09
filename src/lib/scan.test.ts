import { describe, expect, it } from 'vitest'
import { detectReceipt, quadSize, warpGray, whiten, type Pixels, type Quad } from './scan'

/** Dark background with a white tilted quad drawn in it. */
function photo(width: number, height: number, quad: Quad): Pixels {
  const data = new Uint8ClampedArray(width * height * 4)
  const inside = (x: number, y: number) =>
    quad.every((a, i) => {
      const b = quad[(i + 1) % 4]
      return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) >= 0
    })
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = inside(x, y) ? 235 : 60
      data.set([v, v, v, 255], (y * width + x) * 4)
    }
  return { data, width, height }
}

describe('detectReceipt', () => {
  it('finds the corners of a tilted receipt', () => {
    const quad: Quad = [
      { x: 70, y: 20 },
      { x: 150, y: 30 },
      { x: 130, y: 280 },
      { x: 50, y: 270 },
    ]
    const found = detectReceipt(photo(200, 300, quad))!
    found.forEach((p, i) => {
      expect(Math.abs(p.x - quad[i].x)).toBeLessThanOrEqual(2)
      expect(Math.abs(p.y - quad[i].y)).toBeLessThanOrEqual(2)
    })
  })

  it('gives up on a plain image', () => {
    const data = new Uint8ClampedArray(100 * 100 * 4).fill(200)
    expect(detectReceipt({ data, width: 100, height: 100 })).toBeNull()
  })
})

describe('warpGray', () => {
  it('flattens the receipt so it fills the output', () => {
    const quad: Quad = [
      { x: 70, y: 20 },
      { x: 150, y: 30 },
      { x: 130, y: 280 },
      { x: 50, y: 270 },
    ]
    const { width, height } = quadSize(quad)
    const out = warpGray(photo(200, 300, quad), quad, Math.round(width), Math.round(height))
    const white = out.filter((v) => v > 200).length
    expect(white / out.length).toBeGreaterThan(0.97)
  })
})

describe('whiten', () => {
  it('keeps text dark and paper white under a shadow', () => {
    const w = 120
    const h = 40
    // Paper fades from bright to shadowed; a dark stroke crosses both halves.
    const gray = new Uint8ClampedArray(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) gray[y * w + x] = (x < 60 ? 230 : 120) - (y === 20 ? 70 : 0)
    const out = whiten(gray, w, h)
    expect(out[20 * w + 30]).toBeLessThan(128)
    expect(out[20 * w + 90]).toBeLessThan(128)
    expect(out[5 * w + 30]).toBe(255)
    expect(out[5 * w + 90]).toBe(255)
  })
})
