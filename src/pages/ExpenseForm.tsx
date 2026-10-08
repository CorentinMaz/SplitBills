import { Camera, Check, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useUser } from '@/auth'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { addExpense, deleteEntry, updateExpense } from '@/data/entries'
import { useIsMobile } from '@/hooks/use-mobile'
import { CATEGORIES } from '@/lib/categories'
import { reportError } from '@/lib/errors'
import { round2, today } from '@/lib/money'
import { scanReceipt } from '@/lib/ocr'
import { cn } from '@/lib/utils'
import type { GroupOutlet } from '@/pages/GroupPage'
import type { Expense, Group } from '@/types'

/** Drawer on phones, centered dialog on desktop. */
function ResponsiveModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const isMobile = useIsMobile()
  const onOpenChange = (open: boolean) => !open && onClose()
  if (isMobile) {
    return (
      <Drawer open onOpenChange={onOpenChange} repositionInputs={false}>
        <DrawerContent className="max-h-[94dvh]">
          <DrawerHeader className="!text-left">
            <DrawerTitle className="text-2xl">{title}</DrawerTitle>
            <DrawerDescription className="sr-only">Montant, catégorie et répartition</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-5">{children}</div>
        </DrawerContent>
      </Drawer>
    )
  }
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl p-7 pb-0 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription className="sr-only">Montant, catégorie et répartition</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

export default function ExpenseForm() {
  const { expenseId } = useParams()
  const { group, entries } = useOutletContext<GroupOutlet>()
  const existing = entries.find((e): e is Expense => e.id === expenseId && e.kind === 'expense')
  if (expenseId && !existing) return <Navigate to={`/g/${group.id}`} replace />
  return <Form key={expenseId ?? 'new'} group={group} existing={existing} />
}

function Form({ group, existing }: { group: Group; existing?: Expense }) {
  const groupId = group.id
  const user = useUser()
  const navigate = useNavigate()
  const defaultShares = () => Object.fromEntries(group.memberIds.map((id) => [id, group.members[id]?.share ?? 0]))

  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState(existing?.category ?? 'groceries')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [date, setDate] = useState(existing?.date ?? today())
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? user.uid)
  const [shares, setShares] = useState<Record<string, number>>(existing?.shares ?? defaultShares)
  const [custom, setCustom] = useState(
    !!existing && group.memberIds.some((id) => existing.shares[id] !== group.members[id]?.share),
  )
  const [scan, setScan] = useState<{ progress: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const shareTotal = Object.values(shares).reduce((a, b) => a + b, 0)
  const value = Number(amount.replace(',', '.'))
  const close = () => navigate(`/g/${groupId}`)
  const name = (uid: string) => (uid === user.uid ? 'Toi' : (group.members[uid]?.name ?? '?'))

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setError(null)
    setScan({ progress: 0 })
    try {
      const r = await scanReceipt(file, (progress) => setScan({ progress }))
      if (r.total !== undefined) setAmount(r.total.toFixed(2))
      if (r.merchant && !title) setTitle(r.merchant)
      if (r.date) setDate(r.date)
      if (r.total === undefined) setError('Total introuvable sur le ticket. Entre-le à la main.')
      else toast.success('Ticket lu', { description: 'Vérifie le montant avant d’enregistrer.' })
    } catch {
      setError('Le scan a échoué. Vérifie ta connexion la première fois, puis réessaie.')
    } finally {
      setScan(null)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!(value > 0)) return setError('Montant invalide.')
    if (shareTotal !== 100) return setError(`La répartition fait ${shareTotal} %, elle doit faire 100 %.`)
    const data = { title: title.trim() || 'Dépense', category, amount: round2(value), date, paidBy, shares }
    try {
      if (existing) await updateExpense(groupId, existing.id, data)
      else await addExpense(groupId, { ...data, createdBy: user.uid })
      close()
    } catch (err) {
      reportError(err)
    }
  }

  async function remove() {
    if (!existing || !confirm('Supprimer cette dépense?')) return
    await deleteEntry(groupId, existing.id)
    close()
  }

  return (
    <ResponsiveModal title={existing ? 'Modifier la dépense' : 'Ajouter une dépense'} onClose={close}>
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <div className="flex items-center justify-center gap-2 py-2">
          <span className="text-4xl font-bold text-primary">$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            aria-label="Montant"
            required
            className="w-[6.5ch] bg-transparent text-center text-5xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/60"
          />
          <span className="text-lg font-semibold text-muted-foreground">{group.currency}</span>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            onPhoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-12 rounded-full text-base"
          disabled={!!scan}
          onClick={() => fileInput.current?.click()}
        >
          <Camera />
          {scan ? `Lecture du ticket… ${Math.round(scan.progress * 100)} %` : 'Scanner un ticket'}
        </Button>

        <div className="flex flex-col gap-2">
          <Label htmlFor="title" className="text-base font-semibold">
            Description
          </Label>
          <div className="relative">
            <Pencil className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Épicerie, loyer, resto…"
              className="h-12 rounded-xl border-0 bg-muted pl-10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-base font-semibold">Catégorie</Label>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 py-1 md:mx-0 md:flex-wrap md:px-0">
            {CATEGORIES.map((c) => {
              const on = category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'flex min-w-16 shrink-0 flex-col items-center gap-1.5 text-xs font-semibold text-muted-foreground',
                    on && 'text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-13 place-items-center rounded-full transition',
                      on ? 'scale-105 bg-brand text-white shadow-lg shadow-teal-700/35' : c.tint,
                    )}
                  >
                    <c.icon className="size-5" />
                  </span>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label className="text-base font-semibold">Payé par</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className="!h-12 w-full rounded-xl border-0 bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {group.memberIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    <UserAvatar id={id} name={group.members[id]?.name} className="size-6 text-[10px]" />
                    {name(id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date" className="text-base font-semibold">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="h-12 rounded-xl border-0 bg-muted"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Pour qui ?</Label>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 font-semibold"
              onClick={() => {
                if (custom) setShares(defaultShares())
                setCustom(!custom)
              }}
            >
              {custom ? 'Par défaut' : 'Modifier'}
            </Button>
          </div>
          <div className="divide-y rounded-2xl bg-muted">
            {group.memberIds.map((id) => (
              <div key={id} className="flex items-center gap-3 px-3.5 py-3">
                <UserAvatar id={id} name={group.members[id]?.name} className="size-9 text-xs" />
                <span className="flex flex-1 flex-col font-medium">
                  {name(id)}
                  {value > 0 && (
                    <small className="text-muted-foreground">{((value * (shares[id] ?? 0)) / 100).toFixed(2)} $</small>
                  )}
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-muted-foreground">
                  {custom ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={shares[id] ?? 0}
                      onChange={(e) => setShares({ ...shares, [id]: Number(e.target.value) })}
                      className="w-[3.2ch] bg-transparent text-right font-semibold text-foreground outline-none"
                    />
                  ) : (
                    <span className="w-[3.2ch] text-right font-semibold text-foreground">{shares[id] ?? 0}</span>
                  )}
                  %
                </span>
              </div>
            ))}
          </div>
          {shareTotal !== 100 && <p className="text-sm text-destructive">Total : {shareTotal} % (doit faire 100 %)</p>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {existing && (
          <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>
            <Trash2 /> Supprimer
          </Button>
        )}
        <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-background from-70% to-transparent px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] md:-mx-7 md:px-7 md:pb-7">
          <Button className="h-14 w-full rounded-full bg-brand text-base shadow-lg shadow-teal-700/30">
            <Check /> {existing ? 'Enregistrer' : 'Ajouter la dépense'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
