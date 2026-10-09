import { Camera, Check, Pencil, Receipt, Trash2 } from 'lucide-react'
import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react'
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
import { useGroups } from '@/data/groups'
import { useIsMobile } from '@/hooks/use-mobile'
import { CATEGORIES } from '@/lib/categories'
import { reportError } from '@/lib/errors'
import { round2, today } from '@/lib/money'
import { scanReceipt } from '@/lib/ocr'
import { cn } from '@/lib/utils'
import type { Expense, Group } from '@/types'

export type ExpenseTarget = { groupId?: string; expense?: Expense }

const OpenContext = createContext<(target?: ExpenseTarget) => void>(() => {})

/** Lets any page open the add/edit expense modal: `useOpenExpense()({ groupId })`. */
export function useOpenExpense() {
  return useContext(OpenContext)
}

export function ExpenseDialogProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ExpenseTarget | null>(null)
  return (
    <OpenContext.Provider value={(t) => setTarget(t ?? {})}>
      {children}
      {target && <ExpenseModal target={target} onClose={() => setTarget(null)} />}
    </OpenContext.Provider>
  )
}

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
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="flex-row items-center gap-3.5 border-b px-8 py-6 text-left">
          <span className="grid size-11 place-items-center rounded-full bg-secondary text-secondary-foreground">
            <Receipt className="size-5" />
          </span>
          <span className="flex flex-col gap-0.5">
            <DialogTitle className="text-2xl font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-xs font-bold tracking-wider uppercase">Enregistrement partagé</DialogDescription>
          </span>
        </DialogHeader>
        <div className="px-8 pt-6">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

function ExpenseModal({ target, onClose }: { target: ExpenseTarget; onClose: () => void }) {
  const user = useUser()
  const groups = useGroups(user.uid)
  if (!groups) return null
  if (groups.length === 0) {
    toast.info("Crée d'abord un groupe pour ajouter une dépense.")
    onClose()
    return null
  }
  const initial = groups.find((g) => g.id === target.groupId) ?? groups[0]
  return <Form groups={groups} initialGroup={initial} target={target} onClose={onClose} />
}

const fieldLabel = 'text-xs font-bold tracking-wider text-muted-foreground uppercase'
const fieldBox = 'h-12 rounded-xl border-0 bg-muted'

function Form({
  groups,
  initialGroup,
  target,
  onClose,
}: {
  groups: Group[]
  initialGroup: Group
  target: ExpenseTarget
  onClose: () => void
}) {
  const user = useUser()
  const existing = target.expense
  const [group, setGroup] = useState(initialGroup)
  const defaultShares = (g: Group) => Object.fromEntries(g.memberIds.map((id) => [id, g.members[id]?.share ?? 0]))

  const [title, setTitle] = useState(existing?.title ?? '')
  const [category, setCategory] = useState(existing?.category ?? 'groceries')
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [date, setDate] = useState(existing?.date ?? today())
  const [paidBy, setPaidBy] = useState(existing?.paidBy ?? user.uid)
  const [shares, setShares] = useState<Record<string, number>>(existing?.shares ?? defaultShares(group))
  const [custom, setCustom] = useState(
    !!existing && group.memberIds.some((id) => existing.shares[id] !== group.members[id]?.share),
  )
  const [scan, setScan] = useState<{ progress: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const shareTotal = Object.values(shares).reduce((a, b) => a + b, 0)
  const value = Number(amount.replace(',', '.'))
  const name = (uid: string) => (uid === user.uid ? 'Toi' : (group.members[uid]?.name ?? '?'))

  function switchGroup(id: string) {
    const g = groups.find((x) => x.id === id)
    if (!g) return
    setGroup(g)
    setShares(defaultShares(g))
    setCustom(false)
    if (!g.memberIds.includes(paidBy)) setPaidBy(user.uid)
  }

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
      if (existing) await updateExpense(group.id, existing.id, data)
      else await addExpense(group.id, { ...data, createdBy: user.uid })
      toast.success(existing ? 'Dépense modifiée' : 'Dépense ajoutée')
      onClose()
    } catch (err) {
      reportError(err)
    }
  }

  async function remove() {
    if (!existing || !confirm('Supprimer cette dépense?')) return
    await deleteEntry(group.id, existing.id)
    onClose()
  }

  return (
    <ResponsiveModal title={existing ? 'Modifier la dépense' : 'Ajouter une dépense'} onClose={onClose}>
      <form className="flex flex-col gap-6" onSubmit={submit}>
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-muted/60 py-5">
          <span className={fieldLabel}>Montant total de la facture</span>
          <div className="flex items-center gap-2">
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              aria-label="Montant"
              required
              className="w-[6.5ch] bg-transparent text-right text-5xl font-bold tracking-tight text-primary outline-none placeholder:text-primary/40"
            />
            <span className="text-4xl font-bold text-primary">$</span>
          </div>
          <span className="text-sm text-muted-foreground">Devise du groupe · {group.currency}</span>
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

        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title" className={fieldLabel}>
              Intitulé de la dépense
            </Label>
            <div className="relative">
              <Pencil className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Épicerie, loyer, resto…"
                className={cn(fieldBox, 'pl-10')}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label className={fieldLabel}>Groupe concerné</Label>
            <Select value={group.id} onValueChange={switchGroup} disabled={!!existing}>
              <SelectTrigger className={cn(fieldBox, '!h-12 w-full')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className={fieldLabel}>Catégorie</Label>
          <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 py-1 md:mx-0 md:grid md:grid-cols-4 md:px-0">
            {CATEGORIES.map((c) => {
              const on = category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'flex min-w-20 shrink-0 flex-col items-center gap-1.5 rounded-xl border-2 border-transparent bg-muted px-2 py-3 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground',
                    on && 'border-primary bg-secondary text-secondary-foreground',
                  )}
                >
                  <span className={cn('grid size-9 place-items-center rounded-full', on ? 'bg-brand text-white' : c.tint)}>
                    <c.icon className="size-4.5" />
                  </span>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label className={fieldLabel}>Payé par</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger className={cn(fieldBox, '!h-12 w-full')}>
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
            <Label htmlFor="date" className={fieldLabel}>
              Date
            </Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={fieldBox} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className={fieldLabel}>Pour qui ?</Label>
            <Button
              type="button"
              variant="action"
              className="-mr-4 h-7"
              onClick={() => {
                if (custom) setShares(defaultShares(group))
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

        <div className="sticky bottom-0 -mx-5 flex gap-3 bg-gradient-to-t from-background from-70% to-transparent px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] md:-mx-8 md:border-t md:bg-background md:px-8 md:py-5">
          {existing && (
            <Button type="button" variant="ghost" size="icon" className="size-14 rounded-full text-destructive md:size-12" onClick={remove} aria-label="Supprimer">
              <Trash2 />
            </Button>
          )}
          <Button type="button" variant="secondary" className="hidden h-12 rounded-full px-6 md:flex" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="brand" className="h-14 flex-1 rounded-full text-base md:h-12">
            <Check /> {existing ? 'Enregistrer' : 'Ajouter la dépense'}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
