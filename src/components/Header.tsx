import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function Header({ title, back, actions }: { title?: string; back?: string; actions?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <Link to={back} className="round-btn" aria-label="Retour">
          <Icon name="arrow_back" />
        </Link>
      ) : (
        <span className="round-spacer" />
      )}
      {title && <h1 className="topbar-title">{title}</h1>}
      <span className="topbar-actions">{actions ?? <span className="round-spacer" />}</span>
    </header>
  )
}
