import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/** Full-screen view of a receipt photo; scroll to read it, pinch to zoom on phones. */
export function ReceiptViewer({ image, onClose }: { image: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-dvh max-h-none w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-neutral-950 p-0 text-white sm:max-w-none"
      >
        <header className="flex items-center justify-between px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <DialogTitle className="text-lg font-bold">Ticket</DialogTitle>
          <DialogDescription className="sr-only">Photo du ticket de cette dépense</DialogDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [touch-action:pinch-zoom]">
          {image && <img src={image} alt="Ticket" className="mx-auto w-full max-w-xl rounded-lg" />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
