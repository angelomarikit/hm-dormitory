import { BedDouble, DoorOpen, Users } from 'lucide-react'
import { formatDateTime } from '@/utils/format'
import { SampleLabel } from '@/components/public/SampleLabel'
import { Badge } from '@/components/ui/Badge'
import { getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'
import type { AvailabilitySummary, FloorAvailability } from '@/types/database'

export function AvailabilityOverview({
  summary,
  isSample = false,
}: {
  summary: AvailabilitySummary
  isSample?: boolean
}) {
  const occupancyPct = percent(summary.occupiedSpaces, summary.totalCapacity)
  const miniStats = [
    { label: 'Rooms', value: summary.totalRooms, icon: DoorOpen },
    { label: 'Bed capacity', value: summary.totalCapacity, icon: BedDouble },
    { label: 'Occupied', value: summary.occupiedSpaces, icon: Users },
  ]

  return (
    <section id="availability" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs tracking-[0.22em] text-gold uppercase">
            <span className="announce-pulse h-1.5 w-1.5 rounded-full bg-gold" />
            Live occupancy
          </p>
          <span className="gold-rule mt-3" />
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Room availability
            <SampleLabel show={isSample} />
          </h2>
        </div>
        {summary.lastUpdated ? (
          <p className="text-xs tracking-wide text-muted">
            Updated {formatDateTime(summary.lastUpdated)}
          </p>
        ) : null}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <article className="relative overflow-hidden rounded-xl border border-gold/35 bg-white px-6 py-6 sm:col-span-3 lg:col-span-2">
          <span className="pointer-events-none absolute top-0 right-0 h-28 w-28 bg-[radial-gradient(circle_at_top_right,rgba(197,164,106,0.16),transparent_70%)]" />
          <p className="text-[11px] tracking-[0.18em] text-gold uppercase">Bed spaces open</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="font-display text-6xl leading-none">{summary.availableSpaces}</p>
            <p className="mb-1 text-sm text-muted">
              {summary.availableSpaces === 1 ? 'space' : 'spaces'} available
            </p>
          </div>
          <OccupancyBar
            occupied={summary.occupiedSpaces}
            capacity={summary.totalCapacity}
            className="mt-6"
          />
          <p className="mt-3 text-sm text-muted">
            {summary.occupiedSpaces} of {summary.totalCapacity || 0} beds occupied
            {summary.totalCapacity > 0 ? ` · ${occupancyPct}% full` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="available">{`${summary.availableRooms} available`}</Badge>
            <Badge tone="limited">{`${summary.limitedRooms} limited`}</Badge>
            <Badge tone="full">{`${summary.fullRooms} full`}</Badge>
          </div>
        </article>

        {miniStats.map((stat) => (
          <article key={stat.label} className="flex flex-col justify-between rounded-xl border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] tracking-[0.16em] text-muted uppercase">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-gold" />
            </div>
            <p className="mt-6 font-display text-4xl leading-none lg:text-5xl">{stat.value}</p>
          </article>
        ))}
      </div>

      {summary.floors.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {summary.floors.map((floor) => (
            <FloorCard key={floor.floorId} floor={floor} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-line bg-white p-6 text-muted">
          Room information is currently being updated.
        </p>
      )}
    </section>
  )
}

function FloorCard({ floor }: { floor: FloorAvailability }) {
  const empty = floor.roomCount === 0 || floor.capacity === 0
  const status = empty ? null : getRoomStatus(floor.availableSpaces)
  const occupancyPct = percent(floor.occupiedSpaces, floor.capacity)

  return (
    <button
      type="button"
      onClick={() => document.getElementById('rooms')?.scrollIntoView()}
      className="group rounded-xl border border-line bg-white p-5 text-left transition duration-300 hover:border-gold/50 hover:shadow-[0_12px_30px_-18px_rgba(10,10,10,0.25)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-2xl leading-tight">{floor.name}</h3>
        {status ? (
          <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
        ) : (
          <Badge tone="neutral">No rooms</Badge>
        )}
      </div>

      {empty ? (
        <p className="mt-6 text-sm text-muted">No rooms listed on this floor yet.</p>
      ) : (
        <>
          <OccupancyBar occupied={floor.occupiedSpaces} capacity={floor.capacity} className="mt-5" />
          <p className="mt-2 text-xs tracking-wide text-muted">{occupancyPct}% occupied</p>
          <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
            <Metric label="Rooms" value={floor.roomCount} />
            <Metric label="Beds" value={floor.capacity} />
            <Metric label="Taken" value={floor.occupiedSpaces} />
            <Metric label="Open" value={floor.availableSpaces} emphasize />
          </dl>
        </>
      )}
    </button>
  )
}

function Metric({
  label,
  value,
  emphasize = false,
}: {
  label: string
  value: number
  emphasize?: boolean
}) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.14em] text-muted uppercase">{label}</dt>
      <dd className={`mt-1 text-lg font-semibold ${emphasize ? 'text-gold-dark' : ''}`}>{value}</dd>
    </div>
  )
}

function OccupancyBar({
  occupied,
  capacity,
  className = '',
}: {
  occupied: number
  capacity: number
  className?: string
}) {
  const value = percent(occupied, capacity)

  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-paper-2 ${className}`}
      role="progressbar"
      aria-label="Occupancy"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <div
        className="h-full bg-gold transition-[width] duration-700 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

function percent(occupied: number, capacity: number) {
  if (!capacity) return 0
  return Math.round((occupied / capacity) * 100)
}
