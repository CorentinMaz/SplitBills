export type Member = {
  name: string
  /** Percentage of each expense this member is responsible for (0–100). */
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
  amount: number
  paidBy: string
  date: string
  /** Snapshot of the shares when the expense was saved, so changing the ratio later keeps history intact. */
  shares: Record<string, number>
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
