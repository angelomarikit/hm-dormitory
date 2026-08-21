import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useSite } from '@/contexts/SiteContext'
import { scrollToSection } from '@/utils/scroll'

const links = [
  { id: 'top', label: 'Home' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'rates', label: 'Rates' },
  { id: 'faq', label: 'FAQ' },
  { id: 'house-rules', label: 'House Rules' },
  { id: 'contact', label: 'Contact' },
]

export function Navbar() {
  const { site } = useSite()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const activeHash = location.hash.replace('#', '') || 'top'

  function goTo(id: string) {
    setOpen(false)
    if (id === 'top') {
      window.history.replaceState(null, '', '/')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.history.replaceState(null, '', `/#${id}`)
    scrollToSection(id)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3"
          onClick={(event) => {
            event.preventDefault()
            goTo('top')
          }}
        >
          {site?.logo_url ? (
            <img src={site.logo_url} alt="" className="h-9 w-9 rounded-md object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-gold bg-ink text-xs font-semibold tracking-widest text-gold">
              {site?.name.slice(0, 2).toUpperCase() ?? 'HM'}
            </span>
          )}
          <span className="truncate font-display text-xl tracking-wide">{site?.name ?? 'Loading'}</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {links.map((link) => {
            const active = activeHash === link.id
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => goTo(link.id)}
                className={[
                  'relative py-2 text-[13px] tracking-[0.12em] uppercase transition hover:text-ink',
                  active ? 'text-ink' : 'text-muted',
                ].join(' ')}
              >
                {link.label}
                {active ? <span className="absolute inset-x-0 -bottom-0.5 h-px bg-gold" /> : null}
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-ink lg:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open ? (
        <nav className="border-t border-line bg-white px-4 py-3 lg:hidden" aria-label="Mobile">
          <div className="flex flex-col">
            {links.map((link) => (
              <button
                key={link.label}
                type="button"
                className="border-b border-line px-1 py-3 text-left text-base text-ink last:border-b-0"
                onClick={() => goTo(link.id)}
              >
                {link.label}
              </button>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  )
}
