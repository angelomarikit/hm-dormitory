import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { useSite } from '@/contexts/SiteContext'
import { fetchBeds } from '@/services/bedService'
import { fetchAllRooms } from '@/services/roomService'
import { fetchActiveTenants } from '@/services/tenantService'
import { getAvailableSpaces, getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'
import type { Bed } from '@/types/ops'
import type { RoomWithRelations, TenantWithRoom } from '@/types/database'

export default function CaretakerRoomsPage() {
  const { siteId } = useSite()
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [beds, setBeds] = useState<Bed[]>([])

  useEffect(() => {
    if (!siteId) return
    void Promise.all([fetchAllRooms(siteId), fetchActiveTenants(siteId), fetchBeds(siteId)])
      .then(([nextRooms, nextTenants, nextBeds]) => {
        setRooms(nextRooms.filter((room) => room.is_active))
        setTenants(nextTenants)
        setBeds(nextBeds)
      })
      .catch(() => undefined)
  }, [siteId])

  return (
    <div>
      <h1 className="font-display text-3xl">Rooms & beds</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {rooms.map((room) => {
          const assigned = tenants.filter((tenant) => tenant.room_id === room.id)
          const available = getAvailableSpaces(room.capacity, room.occupied_spaces)
          const status = getRoomStatus(available)
          return (
            <article key={room.id} className="rounded-xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-medium">Room {room.room_number}</h2>
                <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">
                {room.occupied_spaces}/{room.capacity} occupied
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {beds
                  .filter((bed) => bed.room_id === room.id)
                  .map((bed) => {
                    const occupant = assigned.find((tenant) => tenant.bed_id === bed.id)
                    return (
                      <li key={bed.id}>
                        {bed.bed_code} · {occupant?.full_name ?? 'Open'}
                      </li>
                    )
                  })}
              </ul>
            </article>
          )
        })}
      </div>
    </div>
  )
}
