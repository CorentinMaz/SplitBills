import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { TabLayout } from './components/BottomNav'
import ErrorBanner from './components/ErrorBanner'
import ExpenseForm from './pages/ExpenseForm'
import GroupPage from './pages/GroupPage'
import Groups from './pages/Groups'
import GroupSettings from './pages/GroupSettings'
import History from './pages/History'
import Home from './pages/Home'
import Join from './pages/Join'
import Login from './pages/Login'
import Profile from './pages/Profile'

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="loading">Chargement…</div>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}

function Bare() {
  return (
    <>
      <ErrorBanner />
      <Outlet />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Bare />}>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<TabLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/g/:groupId" element={<GroupPage />} />
          <Route path="/g/:groupId/settings" element={<GroupSettings />} />
        </Route>
        <Route element={<Bare />}>
          <Route path="/join/:groupId" element={<Join />} />
          <Route path="/g/:groupId/new" element={<ExpenseForm />} />
          <Route path="/g/:groupId/e/:expenseId" element={<ExpenseForm />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
