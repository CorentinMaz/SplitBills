import { Check, RotateCcw } from 'lucide-react'
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { reportError } from '@/lib/errors'
import { findReceipt, flatten, loadPhoto, readReceipt } from '@/lib/ocr'
import { isPdf, loadPdf } from '@/lib/pdf'
import { parseReceipt, type ParsedReceipt } from '@/lib/receipt'
import { receiptToJpeg } from '@/lib/receiptImage'
import { insetQuad, quadSize, type Quad } from '@/lib/scan'

type Photo = { canvas: HTMLCanvasElement; url: string; found: boolean }

/**
 * Full-screen step between the photo and the OCR: the receipt is found automatically and the
 * user can drag its corners, so the background never reaches Tesseract.
 * An imported receipt (screenshot, PDF) is already flat: the frame starts on the whole image,
 * and a PDF with a text layer skips both this step and the OCR.
 * Give it a `key` per photo so each one starts fresh.
 */
export function ReceiptScanner({
  file,
  imported = false,
  onRetake,
  onClose,
  onResult,
}: {
  file: File | null
  imported?: boolean
  onRetake: () => void
  onClose: () => void
  onResult: (r: ParsedReceipt, image: string) => void
}) {
  const [photo, setPhoto] = useState<Photo | null>(null)
  const [quad, setQuad] = useState<Quad | null>(null)
  const [reading, setReading] = useState<{ preview: string; progress: number } | null>(null)

  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  async function ocr(clean: HTMLCanvasElement) {
    setReading({ preview: clean.toDataURL('image/png'), progress: 0 })
    try {
      const r = await readReceipt(clean, (progress) => setReading((s) => s && { ...s, progress }))
      if (live.current) onResult(r, receiptToJpeg(clean))
    } catch (e) {
      console.error(e)
      // Keep the real cause visible: phone-only failures can't be debugged from a generic message.
      const cause = e instanceof Error ? e.message : String(e)
      reportError(new Error(`Le scan a échoué (${cause}). Vérifie ta connexion la première fois, puis réessaie.`))
      setReading(null)
    }
  }

  const pdfLoaded = useEffectEvent(({ image, lines }: Awaited<ReturnType<typeof loadPdf>>) => {
    if (lines.length) onResult(parseReceipt(lines.map((l) => l.text).join('\n'), lines), receiptToJpeg(image))
    else ocr(image)
  })
  const photoLoaded = useEffectEvent((canvas: HTMLCanvasElement) => {
    const { quad, found } = imported ? { quad: insetQuad(canvas.width, canvas.height, 0), found: true } : findReceipt(canvas)
    setPhoto({ canvas, url: canvas.toDataURL('image/jpeg', 0.85), found })
    setQuad(quad)
  })
  const failed = useEffectEvent((e: unknown) => {
    reportError(e)
    onClose()
  })

  useEffect(() => {
    if (!file) return
    let current = true
    if (isPdf(file))
      loadPdf(file)
        .then((pdf) => current && pdfLoaded(pdf))
        .catch(() => failed(new Error('Impossible d’ouvrir ce PDF.')))
    else
      loadPhoto(file)
        .then((canvas) => current && photoLoaded(canvas))
        .catch(failed)
    return () => {
      current = false
    }
  }, [file])

  function read() {
    if (photo && quad) ocr(flatten(photo.canvas, quad))
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && !reading && onClose()}>
      <DialogContent
        showCloseButton={false}
        // No focus ring on "Reprendre" the moment the photo appears.
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="flex h-dvh max-h-none w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-neutral-950 p-0 text-white sm:max-w-none"
      >
        <header className="flex flex-col gap-1 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-center">
          <DialogTitle className="text-lg font-bold">{reading ? 'Lecture du ticket' : 'Ajuste le cadre'}</DialogTitle>
          <DialogDescription className="text-sm text-white/70">
            {reading
              ? 'Tout se passe sur ton téléphone.'
              : imported
                ? 'Recadre sur le ticket si besoin.'
                : photo?.found === false
                ? 'Ticket mal détecté : place les coins sur ses bords.'
                : quad && quadSize(quad).width < 600
                  ? 'Le ticket est petit sur la photo : rapproche-toi pour une meilleure lecture.'
                  : 'Glisse les coins sur les bords du ticket si besoin.'}
          </DialogDescription>
        </header>

        <div className="relative min-h-0 flex-1 px-4">
          {reading ? (
            <img src={reading.preview} alt="Ticket redressé" className="mx-auto h-full object-contain" />
          ) : photo && quad ? (
            <CornerEditor photo={photo} quad={quad} onChange={setQuad} />
          ) : (
            <div className="grid h-full place-items-center text-sm text-white/70">
              {imported ? 'Ouverture du ticket…' : 'Recherche du ticket…'}
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {reading ? (
            <>
              <Progress value={reading.progress * 100} className="bg-white/15" />
              <p className="text-center text-sm text-white/70">{Math.round(reading.progress * 100)} %</p>
            </>
          ) : (
            <>
              {!imported && (
                <p className="text-center text-xs text-white/55">
                  Astuce : ticket à plat, sur une surface foncée et bien éclairée.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  onClick={onRetake}
                >
                  <RotateCcw /> {imported ? 'Changer' : 'Reprendre'}
                </Button>
                <Button type="button" variant="brand" className="h-12 rounded-full" disabled={!quad} onClick={read}>
                  <Check /> Lire le ticket
                </Button>
              </div>
            </>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  )
}

/** The photo with the receipt outline and four draggable corners. */
function CornerEditor({ photo, quad, onChange }: { photo: Photo; quad: Quad; onChange: (q: Quad) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [fit, setFit] = useState({ width: 0, height: 0 })
  const [drag, setDrag] = useState<number | null>(null)
  const { width: W, height: H } = photo.canvas

  // Fit the photo in the available space, so the SVG sits exactly on top of it.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const resize = () => {
      const scale = Math.min(el.clientWidth / W, el.clientHeight / H)
      setFit({ width: W * scale, height: H * scale })
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [W, H])

  function toImage(e: PointerEvent) {
    const m = svg.current!.getScreenCTM()!.inverse()
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
    return { x: Math.min(W, Math.max(0, p.x)), y: Math.min(H, Math.max(0, p.y)) }
  }

  function move(e: PointerEvent) {
    if (drag === null) return
    const next = [...quad] as Quad
    next[drag] = toImage(e)
    onChange(next)
  }

  const unit = Math.max(W, H) / 100
  return (
    <div ref={box} className="grid h-full w-full place-items-center">
      <div className="relative" style={fit}>
        <img src={photo.url} alt="Photo du ticket" className="size-full select-none" draggable={false} />
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 size-full touch-none"
          onPointerMove={move}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
        >
          <defs>
            <mask id="receipt-hole">
              <rect width={W} height={H} fill="white" />
              <polygon points={quad.map((p) => `${p.x},${p.y}`).join(' ')} fill="black" />
            </mask>
          </defs>
          <rect width={W} height={H} fill="black" opacity={0.55} mask="url(#receipt-hole)" />
          <polygon
            points={quad.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#2dd4bf"
            strokeWidth={unit * 0.5}
            strokeLinejoin="round"
          />
          {quad.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={unit * 2.2} fill="#2dd4bf" fillOpacity={0.25} stroke="#2dd4bf" strokeWidth={unit * 0.5} />
              <circle cx={p.x} cy={p.y} r={unit * 0.8} fill="white" />
              {/* Big invisible hit target: fingers are much bigger than the dot. */}
              <circle
                cx={p.x}
                cy={p.y}
                r={unit * 6}
                fill="transparent"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId)
                  setDrag(i)
                }}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
