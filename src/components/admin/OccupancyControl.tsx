import { Minus, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { getAvailableSpaces, getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'

export function OccupancyControl({
  capacity,
  occupied,
  disabled,
  onChange,
}: {
  capacity: number
  occupied: number
  disabled?: boolean
  onChange: (nextOccupied: number) => void
}) {
  const available = getAvailableSpaces(capacity, occupied)
  const status = getRoomStatus(available)

  return (
    <div className="rounded-md bg-paper-2 p-4">
      <p className="text-sm text-muted">Capacity: {capacity}</p>
      <p className="mt-3 text-sm font-medium">Occupied</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Decrease occupied spaces"
          disabled={disabled || occupied <= 0}
          onClick={() => onChange(occupied - 1)}
          className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-ink shadow-sm disabled:opacity-40"
        >
          <Minus className="h-5 w-5" />
        </button>
        <p className="font-display text-4xl">{occupied}</p>
        <button
          type="button"
          aria-label="Increase occupied spaces"
          disabled={disabled || occupied >= capacity}
          onClick={() => onChange(occupied + 1)}
          className="flex h-12 w-12 items-center justify-center rounded-md bg-gold text-ink shadow-sm disabled:opacity-40"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm">Available: {available}</p>
        <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
      </div>
    </div>
  )
}
