import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useUser } from '../auth'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { addExpense, deleteEntry, updateExpense, useEntries } from '../data/entries'
import { useGroup } from '../data/groups'
import { CATEGORIES } from '../lib/categories'
import { round2, today } from '../lib/money'
import { scanReceipt } from '../lib/ocr'
import type { Expense, Group } from '../types'

export default function ExpenseForm() {
  const { groupId = '', expenseId } = useParams()
  const group = useGroup(groupId)
  const entries = useEntries(groupId)

  if (group === null) return <Navigate to="/groups" replace />
  if (!group || (expenseId && !entries)) return <div className="loading">Chargement…</div>
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
    const data = { title: title.trim() || 'Dépense', category, amount: round2(value), date, paidBy, shares }
    if (existing) await updateExpense(groupId, existing.id, data)
    else await addExpense(groupId, { ...data, createdBy: user.uid })
    navigate(`/g/${groupId}`)
  }

  async function remove() {
    if (!existing || !confirm('Supprimer cette dépense?')) return
    await deleteEntry(groupId, existing.id)
    navigate(`/g/${groupId}`)
  }

  const name = (uid: string) => (uid === user.uid ? 'Toi' : (group.members[uid]?.name ?? '?'))
  const close = () => navigate(`/g/${groupId}`)

  return (
    <div className="sheet-backdrop" onClick={close}>
      <form className="sheet" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <span className="grabber" />
        <div className="split">
          <h1 className="headline">{existing ? 'Modifier la dépense' : 'Ajouter une dépense'}</h1>
          <button type="button" className="round-btn" aria-label="Fermer" onClick={close}>
            <Icon name="close" />
          </button>
        </div>

        <div className="amount-field">
          <span className="currency-sign">$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            aria-label="Montant"
            required
          />
          <span className="currency-code">{group.currency}</span>
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
        <button type="button" className="btn tonal" disabled={!!scan} onClick={() => fileInput.current?.click()}>
          <Icon name="photo_camera" />
          {scan ? `Lecture du ticket… ${Math.round(scan.progress * 100)} %` : 'Scanner un ticket'}
        </button>

        <label className="field">
          <span className="field-label">Description</span>
          <span className="input-icon">
            <Icon name="edit" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Épicerie, loyer, resto…" />
          </span>
        </label>

        <div className="field">
          <span className="field-label">Catégorie</span>
          <div className="cat-picker">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cat ${category === c.id ? 'active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                <span className={`cat-circle tint-${c.hue}`}>
                  <Icon name={c.icon} />
                </span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="two-col">
          <label className="field">
            <span className="field-label">Payé par</span>
            <span className="input-icon">
              <Avatar id={paidBy} name={group.members[paidBy]?.name} size={26} />
              <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                {group.memberIds.map((id) => (
                  <option key={id} value={id}>
                    {name(id)}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="field">
            <span className="field-label">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>

        <div className="field">
          <div className="split">
            <span className="field-label">Pour qui ?</span>
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                if (custom) setShares(defaultShares())
                setCustom(!custom)
              }}
            >
              {custom ? 'Par défaut' : 'Modifier'}
            </button>
          </div>
          <div className="share-list">
            {group.memberIds.map((id) => (
              <div key={id} className="share-row">
                <Avatar id={id} name={group.members[id]?.name} size={34} />
                <span className="share-name">
                  {name(id)}
                  {value > 0 && <small className="muted">{((value * (shares[id] ?? 0)) / 100).toFixed(2)} $</small>}
                </span>
                <span className="pct-box">
                  {custom ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={shares[id] ?? 0}
                      onChange={(e) => setShares({ ...shares, [id]: Number(e.target.value) })}
                    />
                  ) : (
                    <span>{shares[id] ?? 0}</span>
                  )}
                  %
                </span>
              </div>
            ))}
          </div>
          {shareTotal !== 100 && <p className="error">Total : {shareTotal} % (doit faire 100 %)</p>}
        </div>

        {error && <p className="error">{error}</p>}
        {existing && (
          <button type="button" className="btn ghost-danger" onClick={remove}>
            <Icon name="delete" /> Supprimer
          </button>
        )}
        <div className="sheet-footer">
          <button className="btn gradient big">
            <Icon name="check" /> {existing ? 'Enregistrer' : 'Ajouter la dépense'}
          </button>
        </div>
      </form>
    </div>
  )
}
