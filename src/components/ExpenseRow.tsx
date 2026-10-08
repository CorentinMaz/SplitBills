import { Link } from 'react-router-dom'
import { categoryOf } from '../lib/categories'
import { relativeDay } from '../lib/dates'
import { formatMoney } from '../lib/money'
import type { Entry } from '../types'
import Icon from './Icon'

type Props = {
  entry: Entry
  groupId: string
  me: string
  nameOf: (uid: string) => string
  currency?: string
  groupName?: string
  onDeletePayment?: () => void
}

export default function ExpenseRow({ entry: e, groupId, me, nameOf, currency, groupName, onDeletePayment }: Props) {
  const money = (n: number) => formatMoney(n, currency)
  const where = groupName ? `${groupName} · ` : ''

  if (e.kind === 'payment') {
    return (
      <li className="bill payment">
        <span className="bill-icon tint-green">
          <Icon name="payments" />
        </span>
        <span className="bill-main">
          <span className="bill-title">
            {nameOf(e.paidBy)} → {nameOf(e.to)}
          </span>
          <span className="bill-sub">
            {where}Remboursement · {relativeDay(e.date)}
          </span>
        </span>
        <span className="bill-amount">
          <strong>{money(e.amount)}</strong>
          {onDeletePayment && (
            <button className="link-btn small danger" onClick={onDeletePayment}>
              Annuler
            </button>
          )}
        </span>
      </li>
    )
  }

  const cat = categoryOf(e.category)
  const total = Object.values(e.shares).reduce((a, b) => a + b, 0) || 100
  const mine = (e.amount * (e.shares[me] ?? 0)) / total
  return (
    <li>
      <Link to={`/g/${groupId}/e/${e.id}`} className="bill">
        <span className={`bill-icon tint-${cat.hue}`}>
          <Icon name={cat.icon} />
        </span>
        <span className="bill-main">
          <span className="bill-title">{e.title}</span>
          <span className="bill-sub">
            {where}
            {e.paidBy === me ? 'Payé par toi' : `Payé par ${nameOf(e.paidBy)}`} · {relativeDay(e.date)}
          </span>
        </span>
        <span className="bill-amount">
          <strong>{money(e.amount)}</strong>
          <span className="label-caps muted">Ta part {money(mine)}</span>
        </span>
      </Link>
    </li>
  )
}
