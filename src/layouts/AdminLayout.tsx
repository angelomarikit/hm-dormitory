import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { Button } from '@/components/ui/Button'
import { KeepAliveOutlet } from '@/components/KeepAliveOutlet'

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/tenants', label: 'Tenants', icon: Users },
  { to: '/admin/announcements', label: 'Announcements', icon: Bell },
  { to: '/admin/rooms', label: 'Rooms', icon: Building2 },
  { to: '/admin/amenities', label: 'Amenities', icon: Sparkles },
  { to: '/admin/rates', label: 'Rates', icon: Wallet },
  { to: '/admin/faqs', label: 'FAQs', icon: CircleHelp },
  { to: '/admin/house-rules', label: 'House Rules', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout() {
  const { site } = useSite()
  const { signOut, role, user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/admin')
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-md px-3 py-3 text-sm',
                isActive ? 'bg-gold text-ink' : 'text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-paper-2 lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="hidden bg-ink text-white lg:flex lg:min-h-screen lg:flex-col">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Administrator</p>
          <p className="mt-1 font-display text-2xl">{site?.name}</p>
        </div>
        {nav}
        <div className="mt-auto border-t border-white/10 p-4 text-xs text-white/70">
          {user?.email}
          {role ? ` · ${role}` : ''}
        </div>
      </aside>

      <div>
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md border border-line p-2 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs tracking-[0.18em] text-gold uppercase">Control panel</p>
              <p className="text-sm font-medium">{site?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void handleSignOut()}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-ink/40"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            />
            <aside className="relative h-full w-72 bg-ink text-white">
              <div className="flex items-center justify-between px-4 py-4">
                <p className="font-display text-xl">{site?.name}</p>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              {nav}
            </aside>
          </div>
        ) : null}

        <div className="px-4 py-6 sm:px-6">
          <KeepAliveOutlet />
        </div>
      </div>
    </div>
  )
}
