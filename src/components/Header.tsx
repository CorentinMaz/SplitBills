import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export default function Header({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <header className="header">
      {back ? (
        <Link to={back} className="icon-btn" aria-label="Retour">
          ‹
        </Link>
      ) : (
        <span className="icon-btn" />
      )}
      <h1>{title}</h1>
      {action ?? <span className="icon-btn" />}
    </header>
  )
}
