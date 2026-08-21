import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SampleLabel } from '@/components/public/SampleLabel'
import { isFilled } from '@/utils/cn'
import type { Site } from '@/types/database'

export function LocationSection({ site, isSample = false }: { site: Site; isSample?: boolean }) {
  return (
    <section id="location" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.22em] text-gold uppercase">Find us</p>
      <span className="gold-rule mt-3" />
      <h2 className="mt-4 font-display text-3xl sm:text-4xl">
        Location
        <SampleLabel show={isSample} />
      </h2>
      {isFilled(site.address) ? <p className="mt-3 max-w-2xl text-muted">{site.address}</p> : null}
      {isFilled(site.google_maps_embed_url) ? (
        <div className="mt-6 overflow-hidden rounded-xl border border-line bg-white">
          <iframe
            title={`${site.name} map`}
            src={site.google_maps_embed_url}
            className="h-72 w-full border-0 sm:h-96"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : null}
      {isFilled(site.google_maps_directions_url) ? (
        <div className="mt-4">
          <a href={site.google_maps_directions_url} target="_blank" rel="noreferrer">
            <Button>
              <Compass className="h-4 w-4" />
              Get Directions
            </Button>
          </a>
        </div>
      ) : null}
    </section>
  )
}
