import {
  Car,
  Ellipsis,
  House,
  type LucideIcon,
  PartyPopper,
  Plane,
  Receipt,
  ShoppingCart,
  Utensils,
} from 'lucide-react'

/** `color` is the solid swatch used in charts. */
export type Category = { id: string; label: string; icon: LucideIcon; tint: string; color: string }

export const TINTS = {
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-400/15 dark:text-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  gray: 'bg-muted text-muted-foreground',
}

export const CATEGORIES: Category[] = [
  { id: 'groceries', color: '#0d9488', label: 'Épicerie', icon: ShoppingCart, tint: TINTS.teal },
  { id: 'food', color: '#f97316', label: 'Resto', icon: Utensils, tint: TINTS.orange },
  { id: 'home', color: '#2563eb', label: 'Logement', icon: House, tint: TINTS.blue },
  { id: 'bills', color: '#7c3aed', label: 'Factures', icon: Receipt, tint: TINTS.violet },
  { id: 'transport', color: '#0891b2', label: 'Transport', icon: Car, tint: TINTS.cyan },
  { id: 'fun', color: '#db2777', label: 'Sorties', icon: PartyPopper, tint: TINTS.pink },
  { id: 'travel', color: '#4f46e5', label: 'Voyage', icon: Plane, tint: TINTS.indigo },
  { id: 'other', color: '#94a3b8', label: 'Autre', icon: Ellipsis, tint: TINTS.gray },
]

export function categoryOf(id?: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
