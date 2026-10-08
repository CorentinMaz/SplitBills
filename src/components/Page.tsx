import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Page body: leaves room for the bottom pill on phones, wider on desktop. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        'mx-auto flex w-full max-w-5xl flex-col gap-5 px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-32 md:px-10 md:pt-8 md:pb-12',
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

export function Fab({ to, label = 'Ajouter une dépense' }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="fixed right-5 bottom-[calc(100px+env(safe-area-inset-bottom))] z-20 grid size-14 place-items-center rounded-full bg-brand text-white shadow-xl shadow-teal-700/40 transition hover:scale-105 md:right-10 md:bottom-10"
    >
      <Plus className="size-7" />
    </Link>
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
