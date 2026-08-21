import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { SiteLogo } from '@/components/BrandMark'
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

const watchedIds = ['top', 'rooms', 'amenities', 'rates', 'faq', 'house-rules', 'location', 'contact']

export function Navbar() {
  const { site } = useSite()
  const [open, setOpen] = useState(false)
  const activeId = useActiveSection()

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
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center"
          aria-label={site?.name ?? 'Home'}
          onClick={(event) => {
            event.preventDefault()
            goTo('top')
          }}
        >
          <SiteLogo url={site?.logo_url} name={site?.name} />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {links.map((link) => {
            const active = activeId === link.id
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
                className={[
                  'border-b border-line px-1 py-3 text-left text-base last:border-b-0',
                  activeId === link.id ? 'text-ink' : 'text-muted',
                ].join(' ')}
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

function useActiveSection() {
  const [activeId, setActiveId] = useState('top')

  useEffect(() => {
    let frame = 0

    function update() {
      const offset = 128
      let current = 'top'

      for (const id of watchedIds) {
        const element = document.getElementById(id)
        if (!element) continue
        if (element.getBoundingClientRect().top - offset <= 0) {
          current = id === 'location' ? 'contact' : id
        }
      }

      setActiveId(current)
    }

    function onScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        update()
      })
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return activeId
}
