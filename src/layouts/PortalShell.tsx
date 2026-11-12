import { useState, type ComponentType } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { UnreadBadge } from '@/components/messages/UnreadBadge'
import { useAuth } from '@/contexts/AuthContext'
import { useSite } from '@/contexts/SiteContext'
import { useStaffMessageUnreads } from '@/hooks/useStaffMessageUnreads'

export interface PortalNavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

export function PortalShell({
  eyebrow,
  items,
  homeTo,
}: {
  eyebrow: string
  items: PortalNavItem[]
  homeTo: string
}) {
  const { site } = useSite()
  const { signOut, user, isCms, isCaretaker } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { total: unreadMessages } = useStaffMessageUnreads()
  const messagesItem = items.find((item) => item.to.includes('/messages'))
  const showStaffMessageBell = Boolean(messagesItem && (isCms || isCaretaker))

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-md px-3 py-3 text-sm',
                isActive ? 'bg-gold text-ink' : 'text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.to.includes('/messages') && (isCms || isCaretaker) ? (
              <UnreadBadge count={unreadMessages} />
            ) : null}
          </NavLink>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-paper-2 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden bg-ink text-white lg:flex lg:min-h-screen lg:flex-col">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">{eyebrow}</p>
          <p className="mt-1 font-display text-2xl">{site?.name}</p>
        </div>
        {nav}
        <div className="mt-auto border-t border-white/10 p-4 text-xs text-white/70">{user?.email}</div>
      </aside>

      <div className="pb-20 lg:pb-0">
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
            <button type="button" className="text-left" onClick={() => navigate(homeTo)}>
              <p className="text-xs tracking-[0.18em] text-gold uppercase">{eyebrow}</p>
              <p className="text-sm font-medium">{site?.name}</p>
            </button>
          </div>
          <div className="flex items-center gap-2">
            {showStaffMessageBell && messagesItem ? (
              <Link
                to={messagesItem.to}
                className="relative rounded-md border border-line p-2 text-ink hover:bg-paper-2"
                aria-label={
                  unreadMessages > 0 ? `${unreadMessages} unread boarder messages` : 'Messages'
                }
              >
                <MessageSquare className="h-5 w-5" />
                <UnreadBadge count={unreadMessages} overlay />
              </Link>
            ) : null}
            <Button variant="outline" onClick={() => void handleSignOut()}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </header>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Close navigation" onClick={() => setOpen(false)} />
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
          <Outlet />
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-white lg:hidden">
          {items.slice(0, 4).map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-1 py-2 text-[10px] tracking-wide uppercase ${isActive ? 'text-ink' : 'text-muted'}`
                }
              >
                <span className="relative">
                  <Icon className="h-4 w-4" />
                  {item.to.includes('/messages') && (isCms || isCaretaker) ? (
                    <UnreadBadge count={unreadMessages} overlay />
                  ) : null}
                </span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
