export type Member = {
  name: string
  share: number
}

export type Group = {
  id: string
  name: string
  currency: string
  createdBy: string
  memberIds: string[]
  members: Record<string, Member>
}

export type Expense = {
  id: string
  kind: 'expense'
  title: string
  category?: string
  amount: number
  paidBy: string
  date: string
  shares: Record<string, number>
  hasReceipt?: boolean
  recurringId?: string
  createdBy: string
  createdAt: number
}

/** A rule that adds the same expense to the group every month, e.g. the rent. */
export type Recurring = {
  id: string
  title: string
  category?: string
  amount: number
  paidBy: string
  shares: Record<string, number>
  day: number
  startMonth: string
  lastMonth: string | null
  createdBy: string
  createdAt: number
}

export type Payment = {
  id: string
  kind: 'payment'
  amount: number
  paidBy: string
  to: string
  date: string
  createdBy: string
  createdAt: number
}

export type Entry = Expense | Payment
