import { Facebook, Mail, MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SampleLabel } from '@/components/public/SampleLabel'
import { isFilled } from '@/utils/cn'
import type { Site } from '@/types/database'

export function ContactSection({ site, isSample = false }: { site: Site; isSample?: boolean }) {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.22em] text-gold uppercase">Inquire</p>
      <span className="gold-rule mt-3" />
      <h2 className="mt-4 font-display text-3xl sm:text-4xl">
        Contact {site.name}
        <SampleLabel show={isSample} />
      </h2>
      {isFilled(site.address) ? <p className="mt-3 max-w-2xl text-muted">{site.address}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {isFilled(site.phone) ? (
          <a href={`tel:${site.phone}`} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 hover:border-gold">
            <Phone className="h-5 w-5 text-gold" />
            {site.phone}
          </a>
        ) : null}
        {isFilled(site.email) ? (
          <a href={`mailto:${site.email}`} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 hover:border-gold">
            <Mail className="h-5 w-5 text-gold" />
            {site.email}
          </a>
        ) : null}
        {isFilled(site.facebook_url) ? (
          <a
            href={site.facebook_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 hover:border-gold"
          >
            <Facebook className="h-5 w-5 text-gold" />
            Facebook
          </a>
        ) : null}
        {isFilled(site.messenger_url) ? (
          <a
            href={site.messenger_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 hover:border-gold"
          >
            <MessageCircle className="h-5 w-5 text-gold" />
            Messenger
          </a>
        ) : null}
      </div>

      {isFilled(site.registration_url) ? (
        <a href={site.registration_url} target="_blank" rel="noreferrer" className="mt-6 inline-block">
          <Button>Open registration form</Button>
        </a>
      ) : null}
    </section>
  )
}
