import { useState } from 'react'
import { SampleLabel } from '@/components/public/SampleLabel'
import { resolveAmenityImage } from '@/data/placeholders'
import type { Amenity } from '@/types/database'

export function AmenitiesSection({
  amenities,
  isSample = false,
}: {
  amenities: Amenity[]
  isSample?: boolean
}) {
  if (amenities.length === 0) return null

  return (
    <section id="amenities" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="text-xs tracking-[0.22em] text-gold uppercase">Facilities</p>
      <span className="gold-rule mt-3" />
      <h2 className="mt-4 font-display text-3xl sm:text-4xl">
        Amenities
        <SampleLabel show={isSample} />
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {amenities.map((amenity) => (
          <article key={amenity.id} className="overflow-hidden rounded-xl border border-line bg-white">
            <AmenityImage name={amenity.name} url={amenity.image_url} />
            <div className="p-5">
              <h3 className="text-lg font-semibold">{amenity.name}</h3>
              {amenity.description ? (
                <p className="mt-2 text-sm leading-6 text-muted">{amenity.description}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function AmenityImage({ name, url }: { name: string; url: string | null }) {
  const src = resolveAmenityImage(url)
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="flex h-40 items-center justify-center bg-paper-2 text-sm text-muted">
        Photo coming soon
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className="h-40 w-full object-cover"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
