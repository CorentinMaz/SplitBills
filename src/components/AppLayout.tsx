import { signOut } from 'firebase/auth'
import { ChartColumn, History, Home, LogOut, Plus, User, Users, Wallet, type LucideIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { displayName, useUser } from '@/auth'
import { ExpenseDialogProvider, useOpenExpense } from '@/components/ExpenseDialog'
import UserAvatar from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
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
import { useGroups } from '@/data/groups'
import { usePushListener, usePushPrompt } from '@/data/push'
import { useRecurringRunner } from '@/data/recurring'
import { auth } from '@/firebase'
import { cn } from '@/lib/utils'

const TABS: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/groups', icon: Users, label: 'Groupes' },
  { to: '/history', icon: History, label: 'Historique' },
  { to: '/stats', icon: ChartColumn, label: 'Suivi' },
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
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <BrandMark />
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-bold tracking-tight text-primary">SplitBills</span>
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Dépenses partagées</span>
          </span>
        </Link>
        <Button variant="brand"
          className="h-12 rounded-full text-base"
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
          <Link to="/profile" className="flex min-w-0 flex-1 flex-col leading-tight hover:[&>span:first-child]:text-primary">
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

/** Phone: floating dark pill, the add button in the middle. History is reached from "Voir tout" on the home page. */
const MOBILE_TABS = TABS.filter((t) => t.to !== '/history')

function MobileNav() {
  const active = useActiveTab()
  const openExpense = useOpenExpense()
  const { pathname } = useLocation()
  const groupId = pathname.match(/^\/g\/([^/]+)/)?.[1]
  const tab = (t: (typeof TABS)[number]) => {
    const on = active === t.to
    return (
      <Link
        key={t.to}
        to={t.to}
        aria-label={t.label}
        className={cn(
          'flex h-11 items-center gap-2 rounded-full px-3 text-[13px] font-bold text-slate-400 transition-all hover:text-white',
          on && 'bg-teal-400 px-4 text-teal-950',
        )}
      >
        <t.icon className="size-5" strokeWidth={on ? 2.5 : 2} />
        {on && <span>{t.label}</span>}
      </Link>
    )
  }
  return (
    <nav
      aria-label="Navigation"
      className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] left-1/2 z-30 flex h-16 w-[calc(100%-40px)] max-w-[520px] -translate-x-1/2 items-center justify-around rounded-full bg-slate-900/95 px-2.5 shadow-2xl backdrop-blur-xl md:hidden"
    >
      {MOBILE_TABS.slice(0, 2).map(tab)}
      <button
        type="button"
        aria-label="Ajouter une dépense"
        onClick={() => openExpense({ groupId })}
        className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:scale-105"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </button>
      {MOBILE_TABS.slice(2).map(tab)}
    </nav>
  )
}

export default function AppLayout() {
  const { uid } = useUser()
  usePushListener(uid)
  usePushPrompt(uid)
  useRecurringRunner(useGroups(uid))
  return (
    <ExpenseDialogProvider>
      <SidebarProvider style={{ '--sidebar-width': '17rem' } as CSSProperties}>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <Outlet />
        </SidebarInset>
        <MobileNav />
      </SidebarProvider>
    </ExpenseDialogProvider>
  )
}
