import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { RoomCard } from '@/components/public/RoomCard'
import { RoomModal } from '@/components/public/RoomModal'
import { SampleLabel } from '@/components/public/SampleLabel'
import { cn } from '@/utils/cn'
import type { Floor, RoomWithRelations } from '@/types/database'

export function RoomsSection({
  rooms,
  floors,
  showAllFloors = true,
  isSample = false,
}: {
  rooms: RoomWithRelations[]
  floors: Floor[]
  showAllFloors?: boolean
  isSample?: boolean
}) {
  const [selected, setSelected] = useState<RoomWithRelations | null>(null)
  const [floorId, setFloorId] = useState<string>('all')
  const scroller = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const grouped = useMemo(
    () =>
      floors
        .filter((floor) => floor.is_active)
        .map((floor) => ({
          floor,
          rooms: rooms.filter((room) => room.floor_id === floor.id && room.is_active),
        }))
        .filter((group) => group.rooms.length > 0),
    [floors, rooms],
  )

  const visibleRooms = useMemo(() => {
    if (!showAllFloors) return rooms
    if (floorId === 'all') return rooms.filter((room) => room.is_active)
    return rooms.filter((room) => room.floor_id === floorId && room.is_active)
  }, [floorId, rooms, showAllFloors])

  function updateArrows() {
    const el = scroller.current
    if (!el) return
    setCanPrev(el.scrollLeft > 8)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  function scrollByDir(dir: -1 | 1) {
    const el = scroller.current
    if (!el) return
    const card = el.querySelector('[data-room-slide]')
    const amount = card ? card.getBoundingClientRect().width + 20 : 340
    el.scrollBy({ left: dir * amount, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ left: 0 })
    const frame = requestAnimationFrame(updateArrows)
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    const observer = new ResizeObserver(updateArrows)
    observer.observe(el)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
      observer.disconnect()
    }
  }, [visibleRooms])

  if (rooms.length === 0) {
    return (
      <section id="rooms" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-xs tracking-[0.22em] text-gold uppercase">Stay with us</p>
        <span className="gold-rule mt-3" />
        <h2 className="mt-4 font-display text-3xl sm:text-4xl">
          Rooms
          <SampleLabel show={isSample} />
        </h2>
        <p className="mt-4 rounded-xl border border-line bg-white p-6 text-muted">
          Room information is currently being updated.
        </p>
      </section>
    )
  }

  const showFloorTabs = showAllFloors && grouped.length > 1

  return (
    <section id="rooms" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Stay with us</p>
          <span className="gold-rule mt-3" />
          <h2 className="mt-4 font-display text-3xl sm:text-4xl">
            Rooms
            <SampleLabel show={isSample} />
          </h2>
        </div>
        {visibleRooms.length > 1 ? (
          <div className="hidden items-center gap-2 sm:flex">
            <CarouselButton label="Previous rooms" disabled={!canPrev} onClick={() => scrollByDir(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </CarouselButton>
            <CarouselButton label="Next rooms" disabled={!canNext} onClick={() => scrollByDir(1)}>
              <ChevronRight className="h-5 w-5" />
            </CarouselButton>
          </div>
        ) : null}
      </div>

      {showFloorTabs ? (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          <FloorTab active={floorId === 'all'} onClick={() => setFloorId('all')}>
            All rooms
          </FloorTab>
          {grouped.map((group) => (
            <FloorTab
              key={group.floor.id}
              active={floorId === group.floor.id}
              onClick={() => setFloorId(group.floor.id)}
            >
              {group.floor.name}
            </FloorTab>
          ))}
        </div>
      ) : null}

      <div
        ref={scroller}
        className="mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleRooms.map((room) => (
          <div
            key={room.id}
            data-room-slide
            className="w-[min(85vw,21.5rem)] shrink-0 snap-start sm:w-[22.5rem]"
          >
            <RoomCard room={room} onView={() => setSelected(room)} />
          </div>
        ))}
      </div>
      <RoomModal key={selected?.id ?? 'closed'} room={selected} onClose={() => setSelected(null)} />
    </section>
  )
}

function FloorTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-lg border px-4 py-2 text-sm tracking-wide transition',
        active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:border-gold hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function CarouselButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-ink transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}
