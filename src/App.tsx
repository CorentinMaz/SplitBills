import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import ErrorBanner from './components/ErrorBanner'
import ExpenseForm from './pages/ExpenseForm'
import GroupPage from './pages/GroupPage'
import Groups from './pages/Groups'
import GroupSettings from './pages/GroupSettings'
import Join from './pages/Join'
import Login from './pages/Login'

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="center muted">Chargement…</div>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}

export default function App() {
  return (
    <>
      <ErrorBanner />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Groups />} />
          <Route path="/join/:groupId" element={<Join />} />
          <Route path="/g/:groupId" element={<GroupPage />} />
          <Route path="/g/:groupId/new" element={<ExpenseForm />} />
          <Route path="/g/:groupId/e/:expenseId" element={<ExpenseForm />} />
          <Route path="/g/:groupId/settings" element={<GroupSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
