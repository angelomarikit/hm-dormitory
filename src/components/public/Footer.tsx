import { Facebook, Mail, MapPin, Phone } from 'lucide-react'
import { useSite } from '@/contexts/SiteContext'
import { isFilled } from '@/utils/cn'
import { mergeSiteWithPlaceholders } from '@/data/placeholders'

export function Footer() {
  const { site } = useSite()
  if (!site) return null
  const displaySite = mergeSiteWithPlaceholders(site)

  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            {displaySite.logo_url ? (
              <img src={displaySite.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
            ) : null}
            <p className="font-display text-2xl">{displaySite.name}</p>
          </div>
          <span className="gold-rule mt-4" />
          {isFilled(displaySite.short_description) ? (
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted">{displaySite.short_description}</p>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-gold uppercase">Quick links</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <a href="/#top" className="text-muted hover:text-ink">Home</a>
            <a href="/#rooms" className="text-muted hover:text-ink">Rooms</a>
            <a href="/#house-rules" className="text-muted hover:text-ink">House Rules</a>
            <a href="/#contact" className="text-muted hover:text-ink">Contact</a>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted">
          {isFilled(displaySite.address) ? (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {displaySite.address}
            </p>
          ) : null}
          {isFilled(displaySite.phone) ? (
            <a href={`tel:${displaySite.phone}`} className="flex items-center gap-2 hover:text-ink">
              <Phone className="h-4 w-4 text-gold" />
              {displaySite.phone}
            </a>
          ) : null}
          {isFilled(displaySite.email) ? (
            <a href={`mailto:${displaySite.email}`} className="flex items-center gap-2 hover:text-ink">
              <Mail className="h-4 w-4 text-gold" />
              {displaySite.email}
            </a>
          ) : null}
          {isFilled(displaySite.facebook_url) ? (
            <a href={displaySite.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-ink">
              <Facebook className="h-4 w-4 text-gold" />
              Facebook
            </a>
          ) : null}
        </div>
      </div>
      <div className="border-t border-line px-4 py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {displaySite.name}. All rights reserved.
      </div>
    </footer>
  )
}
