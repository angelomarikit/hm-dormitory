import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { getAvailableSpaces, getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'
import type { RoomWithRelations } from '@/types/database'

export function RoomModal({
  room,
  onClose,
}: {
  room: RoomWithRelations | null
  onClose: () => void
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  if (!room) return null

  const available = getAvailableSpaces(room.capacity, room.occupied_spaces)
  const status = getRoomStatus(available)
  const images = room.room_images
  const activeImage = images[activeIndex]

  return (
    <Modal open={Boolean(room)} title={`Room ${room.room_number}`} onClose={onClose} wide>
      <div className="space-y-5">
        {activeImage ? (
          <img
            src={activeImage.image_url}
            alt={activeImage.alt_text || `Room ${room.room_number}`}
            className="h-64 w-full rounded-2xl object-cover sm:h-80"
          />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl bg-paper-2 text-muted">
            Photos will appear here once uploaded.
          </div>
        )}
        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl border ${
                  index === activeIndex ? 'border-gold' : 'border-transparent'
                }`}
              >
                <img src={image.image_url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
          <p className="text-sm text-muted">{room.floors?.name}</p>
        </div>
        {room.room_name ? <p className="font-medium">{room.room_name}</p> : null}
        {room.description ? (
          <p className="whitespace-pre-line text-sm leading-6 text-muted">{room.description}</p>
        ) : null}
        <dl className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-gold/35 bg-[#fbf7f0] p-3">
            <dt className="text-[11px] tracking-[0.14em] text-gold-dark uppercase">Capacity</dt>
            <dd className="mt-1 font-display text-2xl text-gold-dark">{room.capacity}</dd>
          </div>
          <div className="rounded-xl border border-[#d7b7a8] bg-[#f8f0ec] p-3">
            <dt className="text-[11px] tracking-[0.14em] text-[#9a5b45] uppercase">Occupied</dt>
            <dd className="mt-1 font-display text-2xl text-[#7a3f2b]">{room.occupied_spaces}</dd>
          </div>
          <div className="rounded-xl border border-[#b7c9b4] bg-[#f3f7f2] p-3">
            <dt className="text-[11px] tracking-[0.14em] text-[#4f7a58] uppercase">Available</dt>
            <dd className="mt-1 font-display text-2xl text-[#2f5d3a]">{available}</dd>
          </div>
        </dl>
      </div>
    </Modal>
  )
}
