import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../auth'
import Header from '../components/Header'
import { addExpense, deleteEntry, updateExpense, useEntries } from '../data/entries'
import { useGroup } from '../data/groups'
import { round2, today } from '../lib/money'
import { scanReceipt } from '../lib/ocr'
import type { Expense, Group } from '../types'

export default function ExpenseForm() {
  const { groupId = '', expenseId } = useParams()
  const group = useGroup(groupId)
  const entries = useEntries(groupId)

  if (group === null) return <Navigate to="/" replace />
  if (!group || (expenseId && !entries)) return <div className="center muted">Chargement…</div>
  const existing = entries?.find((e): e is Expense => e.id === expenseId && e.kind === 'expense')
  if (expenseId && !existing) return <Navigate to={`/g/${groupId}`} replace />
  return <Form key={expenseId ?? 'new'} group={group} existing={existing} />
}

function Form({ group, existing }: { group: Group; existing?: Expense }) {
  const groupId = group.id
  const user = useUser()
  const navigate = useNavigate()
  const defaultShares = () => Object.fromEntries(group.memberIds.map((id) => [id, group.members[id]?.share ?? 0]))

  const [title, setTitle] = useState(existing?.title ?? '')
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

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setError(null)
    setScan({ progress: 0 })
    try {
      const r = await scanReceipt(file, (progress) => setScan({ progress }))
      if (r.total !== undefined) setAmount(r.total.toFixed(2))
      if (r.merchant && !title) setTitle(r.merchant)
      if (r.date) setDate(r.date)
      if (r.total === undefined) setError("Total introuvable sur le ticket. Entre-le à la main.")
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
    const data = { title: title.trim() || 'Dépense', amount: round2(value), date, paidBy, shares }
    if (existing) await updateExpense(groupId, existing.id, data)
    else await addExpense(groupId, { ...data, createdBy: user.uid })
    navigate(`/g/${groupId}`)
  }

  async function remove() {
    if (!existing || !confirm('Supprimer cette dépense?')) return
    await deleteEntry(groupId, existing.id)
    navigate(`/g/${groupId}`)
  }

  const name = (uid: string) => (uid === user.uid ? 'Moi' : group.members[uid]?.name)

  return (
    <main className="page">
      <Header title={existing ? 'Modifier' : 'Nouvelle dépense'} back={`/g/${groupId}`} />

      <form className="stack" onSubmit={submit}>
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
        <button type="button" className="btn scan" disabled={!!scan} onClick={() => fileInput.current?.click()}>
          {scan ? `Lecture du ticket… ${Math.round(scan.progress * 100)} %` : '📷 Scanner un ticket'}
        </button>

        <div className="card stack">
          <label>
            Description
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Épicerie, loyer, resto…" />
          </label>
          <label>
            Montant
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              className="amount"
            />
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Payé par
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {group.memberIds.map((id) => (
                <option key={id} value={id}>
                  {name(id)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="card stack">
          <div className="split">
            <h2>Répartition</h2>
            <label className="toggle">
              <input
                type="checkbox"
                checked={custom}
                onChange={(e) => {
                  setCustom(e.target.checked)
                  if (!e.target.checked) setShares(defaultShares())
                }}
              />
              Personnaliser
            </label>
          </div>
          {group.memberIds.map((id) => (
            <div key={id} className="split">
              <span>{name(id)}</span>
              <span className="split-tight">
                {custom ? (
                  <input
                    className="pct"
                    type="number"
                    min={0}
                    max={100}
                    value={shares[id] ?? 0}
                    onChange={(e) => setShares({ ...shares, [id]: Number(e.target.value) })}
                  />
                ) : (
                  <span>{shares[id] ?? 0}</span>
                )}
                % {value > 0 && <span className="muted">· {((value * (shares[id] ?? 0)) / 100).toFixed(2)} $</span>}
              </span>
            </div>
          ))}
          {shareTotal !== 100 && <p className="error">Total : {shareTotal} % (doit faire 100 %)</p>}
        </div>

        {error && <p className="error">{error}</p>}
        <button className="btn primary">{existing ? 'Enregistrer' : 'Ajouter la dépense'}</button>
        {existing && (
          <button type="button" className="btn danger" onClick={remove}>
            Supprimer
          </button>
        )}
      </form>
    </main>
  )
}
