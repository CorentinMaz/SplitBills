import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth'
import AppLayout from '@/components/AppLayout'
import { Loading } from '@/components/Page'
import GroupPage from '@/pages/GroupPage'
import Groups from '@/pages/Groups'
import GroupSettings from '@/pages/GroupSettings'
import History from '@/pages/History'
import Home from '@/pages/Home'
import Join from '@/pages/Join'
import Login from '@/pages/Login'
import Profile from '@/pages/Profile'
import Stats from '@/pages/Stats'

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/join/:groupId" element={<Join />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/g/:groupId" element={<GroupPage />} />
          <Route path="/g/:groupId/settings" element={<GroupSettings />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
