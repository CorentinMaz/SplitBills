import { History, Home, User, Users, Wallet, type LucideIcon } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/components/ui/sidebar'
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
  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-6 pb-4">
        <Link to="/" className="flex items-center gap-3 text-xl font-bold tracking-tight text-primary">
          <BrandMark />
          SplitBills
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {TABS.map((t) => (
                <SidebarMenuItem key={t.to}>
                  <SidebarMenuButton asChild isActive={active === t.to} size="lg" className="px-4 font-semibold">
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
    </Sidebar>
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <Outlet />
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  )
}
