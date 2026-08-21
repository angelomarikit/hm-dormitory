import { ArrowUpRight, BedDouble, Compass, ClipboardList, DoorOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SampleLabel } from '@/components/public/SampleLabel'
import { isFilled } from '@/utils/cn'
import type { Site } from '@/types/database'

interface HeroProps {
  site: Site
  availableSpaces: number
  isSample?: boolean
  onCheckAvailability: () => void
  onViewRooms: () => void
}

export function Hero({ site, availableSpaces, isSample = false, onCheckAvailability, onViewRooms }: HeroProps) {
  const image = site.hero_image_url || site.building_image_url

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        <div>
          <p className="text-xs tracking-[0.28em] text-gold uppercase">
            {site.name}
            <SampleLabel show={isSample} />
          </p>
          <span className="gold-rule mt-4" />
          <h1 className="mt-5 max-w-xl font-display text-4xl leading-[1.12] text-ink sm:text-5xl lg:text-[3.5rem]">
            {site.hero_heading || site.name}
          </h1>
          {isFilled(site.hero_subheading) ? (
            <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
              {site.hero_subheading}
            </p>
          ) : isFilled(site.short_description) ? (
            <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
              {site.short_description}
            </p>
          ) : null}

          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-white px-4 py-2 text-sm">
            <BedDouble className="h-4 w-4 text-gold" />
            <span>
              {availableSpaces} bed {availableSpaces === 1 ? 'space' : 'spaces'} available
            </span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-lg">
            <Button onClick={onCheckAvailability} className="w-full">
              <ClipboardList className="h-4 w-4" />
              Check Availability
            </Button>
            <Button variant="secondary" onClick={onViewRooms} className="w-full">
              <DoorOpen className="h-4 w-4" />
              View Rooms
            </Button>
            {isFilled(site.registration_url) ? (
              <a href={site.registration_url} target="_blank" rel="noreferrer" className="contents">
                <Button variant="outline" className="w-full">
                  Registration Form
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </a>
            ) : null}
            {isFilled(site.google_maps_directions_url) ? (
              <a href={site.google_maps_directions_url} target="_blank" rel="noreferrer" className="contents">
                <Button variant="outline" className="w-full">
                  <Compass className="h-4 w-4" />
                  Get Directions
                </Button>
              </a>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => document.getElementById('location')?.scrollIntoView()}>
                <Compass className="h-4 w-4" />
                Get Directions
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          {image ? (
            <img
              src={image}
              alt={`${site.name} building`}
              className="aspect-[4/5] w-full rounded-xl object-cover sm:aspect-[5/6]"
            />
          ) : (
            <div className="flex aspect-[4/5] items-end rounded-xl border border-line bg-paper-2 p-8 text-muted sm:aspect-[5/6]">
              Add a hero photo in Settings to complete this section.
            </div>
          )}
          <span className="pointer-events-none absolute -top-3 -left-3 hidden h-16 w-16 border-t border-l border-gold lg:block" />
        </div>
      </div>
    </section>
  )
}
