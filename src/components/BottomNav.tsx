import { NavLink, Outlet, useLocation } from 'react-router-dom'
import ErrorBanner from './ErrorBanner'
import Icon from './Icon'

const TABS = [
  { to: '/', icon: 'home', label: 'Accueil' },
  { to: '/groups', icon: 'group', label: 'Groupes' },
  { to: '/history', icon: 'history', label: 'Historique' },
  { to: '/profile', icon: 'person', label: 'Profil' },
]

export function TabLayout() {
  const { pathname } = useLocation()
  // Group pages live under /g/… but belong to the "Groupes" tab.
  const active = pathname.startsWith('/g/') ? '/groups' : pathname
  return (
    <>
      <ErrorBanner />
      <Outlet />
      <nav className="bottom-nav" aria-label="Navigation">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={`nav-tab ${active === t.to ? 'active' : ''}`}>
            <Icon name={t.icon} fill={active === t.to} />
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
