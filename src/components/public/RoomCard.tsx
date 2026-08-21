import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getAvailableSpaces, getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'
import type { RoomWithRelations } from '@/types/database'

export function RoomCard({
  room,
  onView,
}: {
  room: RoomWithRelations
  onView: () => void
}) {
  const available = getAvailableSpaces(room.capacity, room.occupied_spaces)
  const status = getRoomStatus(available)
  const image = room.room_images[0]?.image_url

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white">
      {image ? (
        <img
          src={image}
          alt={room.room_images[0]?.alt_text || `Room ${room.room_number}`}
          className="h-52 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-52 items-center justify-center bg-paper-2 text-sm text-muted">
          Photo coming soon
        </div>
      )}
      <div className="flex flex-1 flex-col space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl">Room {room.room_number}</h3>
            <p className="text-sm text-muted">
              {room.floors?.name ?? 'Floor'}
              {room.room_name ? ` · ${room.room_name}` : ''}
            </p>
          </div>
          <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
        </div>
        {room.description ? (
          <p className="line-clamp-3 text-sm leading-6 text-muted">{room.description}</p>
        ) : null}
        <p className="text-sm">
          Capacity {room.capacity} · {available} available
        </p>
        <Button variant="outline" className="mt-auto w-full" onClick={onView}>
          View Room
        </Button>
      </div>
    </article>
  )
}
