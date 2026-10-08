import { signOut } from 'firebase/auth'
import { History, Home, LogOut, Plus, Search, User, Users, Wallet, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { displayName, useUser } from '@/auth'
import { ExpenseDialogProvider, useOpenExpense } from '@/components/ExpenseDialog'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
import { auth } from '@/firebase'
import { cn } from '@/lib/utils'

const TABS: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/groups', icon: Users, label: 'Groupes' },
  { to: '/history', icon: History, label: 'Historique' },
  { to: '/profile', icon: User, label: 'Profil' },
]

function useActiveTab() {
  const { pathname } = useLocation()
  // Group pages live under /g/… but belong to the "Groupes" tab.
  return pathname.startsWith('/g/') ? '/groups' : pathname
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('grid size-10 place-items-center rounded-xl bg-brand text-white shadow-md', className)}>
      <Wallet className="size-5" />
    </span>
  )
}

/** Desktop: shadcn sidebar on the left. */
function AppSidebar() {
  const active = useActiveTab()
  const user = useUser()
  const openExpense = useOpenExpense()
  const { pathname } = useLocation()
  const groupId = pathname.match(/^\/g\/([^/]+)/)?.[1]
  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="gap-6 px-5 pt-7 pb-4">
        <Link to="/" className="flex items-center gap-3">
          <BrandMark />
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-bold tracking-tight text-primary">SplitBills</span>
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Dépenses partagées</span>
          </span>
        </Link>
        <Button
          className="h-12 rounded-full bg-brand text-base shadow-lg shadow-teal-700/30"
          onClick={() => openExpense({ groupId })}
        >
          <Plus /> Nouvelle dépense
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {TABS.map((t) => (
                <SidebarMenuItem key={t.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={active === t.to}
                    size="lg"
                    className="rounded-full px-5 text-[15px] data-[active=true]:font-semibold"
                  >
                    <Link to={t.to}>
                      <t.icon />
                      <span>{t.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
          <Link to="/profile">
            <UserAvatar id={user.uid} name={displayName(user)} />
          </Link>
          <Link to="/profile" className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate font-semibold">{displayName(user)}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </Link>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Se déconnecter" onClick={() => signOut(auth)}>
            <LogOut />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

/** Desktop top bar: search that jumps to the history page. */
function TopBar() {
  const user = useUser()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  return (
    <div className="sticky top-0 z-10 hidden items-center justify-between gap-4 border-b bg-background/85 px-10 py-3 backdrop-blur md:flex">
      <form
        className="relative w-full max-w-md"
        onSubmit={(e) => {
          e.preventDefault()
          navigate(`/history?q=${encodeURIComponent(q.trim())}`)
        }}
      >
        <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une dépense…"
          className="h-11 rounded-full border-0 bg-card pl-11 shadow-soft"
        />
      </form>
      <Link to="/profile" aria-label="Profil">
        <UserAvatar id={user.uid} name={displayName(user)} className="size-10" />
      </Link>
    </div>
  )
}

/** Phone: floating dark pill at the bottom, active tab expands with its label. */
function MobileNav() {
  const active = useActiveTab()
  return (
    <nav
      aria-label="Navigation"
      className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] left-1/2 z-30 flex h-16 w-[calc(100%-40px)] max-w-[520px] -translate-x-1/2 items-center justify-around rounded-full bg-slate-900/95 px-2.5 shadow-2xl backdrop-blur-xl md:hidden"
    >
      {TABS.map((t) => {
        const on = active === t.to
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              'flex h-11 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold text-slate-400 transition-all',
              on && 'bg-teal-400 px-4.5 text-teal-950',
            )}
          >
            <t.icon className="size-5" strokeWidth={on ? 2.5 : 2} />
            {on && <span>{t.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

export default function AppLayout() {
  return (
    <ExpenseDialogProvider>
      <SidebarProvider style={{ '--sidebar-width': '17rem' } as CSSProperties}>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <TopBar />
          <Outlet />
        </SidebarInset>
        <MobileNav />
      </SidebarProvider>
    </ExpenseDialogProvider>
  )
}
