export type Category = { id: string; label: string; icon: string; hue: string }

export const CATEGORIES: Category[] = [
  { id: 'groceries', label: 'Épicerie', icon: 'shopping_cart', hue: 'teal' },
  { id: 'food', label: 'Resto', icon: 'restaurant', hue: 'orange' },
  { id: 'home', label: 'Logement', icon: 'house', hue: 'blue' },
  { id: 'bills', label: 'Factures', icon: 'receipt_long', hue: 'violet' },
  { id: 'transport', label: 'Transport', icon: 'directions_car', hue: 'cyan' },
  { id: 'fun', label: 'Sorties', icon: 'celebration', hue: 'pink' },
  { id: 'travel', label: 'Voyage', icon: 'flight', hue: 'indigo' },
  { id: 'other', label: 'Autre', icon: 'more_horiz', hue: 'gray' },
]

export function categoryOf(id?: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}
