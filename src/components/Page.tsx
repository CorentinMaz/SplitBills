import { type LucideIcon, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useOpenExpense } from '@/components/ExpenseDialog'
import { cn } from '@/lib/utils'

/** Page body: leaves room for the bottom pill on phones, wider on desktop. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-32 md:max-w-none md:px-8 md:pt-8 md:pb-12 xl:px-10',
        className,
      )}
    >
      {children}
    </main>
  )
}

export function Loading() {
  return <div className="py-20 text-center text-muted-foreground">Chargement…</div>
}

/** Phone-only floating "add expense" button; desktop uses the sidebar button. */
export function Fab({ groupId }: { groupId?: string }) {
  const open = useOpenExpense()
  return (
    <button
      type="button"
      aria-label="Ajouter une dépense"
      onClick={() => open({ groupId })}
      className="fixed right-5 bottom-[calc(100px+env(safe-area-inset-bottom))] z-20 grid size-14 place-items-center rounded-full bg-brand text-white shadow-xl shadow-teal-700/40 transition hover:scale-105 md:hidden"
    >
      <Plus className="size-7" />
    </button>
  )
}

/** Small uppercase label above a page title, e.g. "ESPACE PARTAGÉ". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase', className)}>
      {children}
    </span>
  )
}

/** Desktop stat tile: label, big value, hint, round icon on the right. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tint,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tint?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 rounded-xl bg-card p-5 shadow-soft', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-bold tracking-wider uppercase opacity-80">{label}</span>
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {hint && <span className="text-sm opacity-80">{hint}</span>}
      </div>
      {Icon && (
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-full', tint)}>
          <Icon className="size-6" />
        </span>
      )}
    </div>
  )
}

export function Money({ value, currency, className }: { value: number; currency?: string; className?: string }) {
  const sign = value > 0.005 ? '+ ' : value < -0.005 ? '− ' : ''
  const tone = value > 0.005 ? 'text-positive' : value < -0.005 ? 'text-negative' : ''
  return (
    <span className={cn(tone, className)}>
      {sign}
      {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: currency ?? 'CAD' }).format(Math.abs(value))}
    </span>
  )
}
