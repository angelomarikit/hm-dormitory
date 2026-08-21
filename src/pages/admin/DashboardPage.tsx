import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatCard } from '@/components/admin/StatCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { groupRoomsByStandardFloor, roomTypeLabel, STANDARD_FLOORS } from '@/data/standardRooms'
import { toUserMessage } from '@/lib/errors'
import { fetchAllAnnouncements } from '@/services/announcementService'
import { fetchAllFloors } from '@/services/floorService'
import { ensureStandardLayout } from '@/services/layoutService'
import { buildAvailabilitySummary, fetchAllRooms } from '@/services/roomService'
import { fetchActiveTenants } from '@/services/tenantService'
import { formatDate } from '@/utils/format'
import { getAvailableSpaces, getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'
import type { AvailabilitySummary, Floor, RoomWithRelations, TenantWithRoom } from '@/types/database'

type FloorFilter = 'all' | number

export default function DashboardPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [announcementCount, setAnnouncementCount] = useState(0)
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [stats, setStats] = useState<AvailabilitySummary | null>(null)
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('all')

  useEffect(() => {
    if (!siteId) return
    const id: string = siteId
    let cancelled = false

    async function load(currentSiteId: string) {
      setLoading(true)
      try {
        await ensureStandardLayout(currentSiteId)
        const [nextRooms, nextFloors, announcements, nextTenants] = await Promise.all([
          fetchAllRooms(currentSiteId),
          fetchAllFloors(currentSiteId),
          fetchAllAnnouncements(currentSiteId),
          fetchActiveTenants(currentSiteId),
        ])
        if (cancelled) return
        const activeFloors = nextFloors.filter((floor) => floor.is_active)
        const activeRooms = nextRooms.filter((room) => room.is_active)
        setRooms(activeRooms)
        setFloors(activeFloors)
        setTenants(nextTenants)
        setStats(buildAvailabilitySummary(activeRooms, activeFloors))
        setAnnouncementCount(announcements.length)
      } catch (error) {
        if (!cancelled) {
          setStats(buildAvailabilitySummary([], []))
          toast.error(toUserMessage(error, 'Unable to load dashboard occupancy.'))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(id)
    return () => {
      cancelled = true
    }
  }, [siteId])

  const grouped = useMemo(() => {
    const layout = groupRoomsByStandardFloor(floors, rooms)
    return layout
      .filter((group) => floorFilter === 'all' || group.spec.floorNumber === floorFilter)
      .map((group) => ({
        ...group,
        rooms: group.rooms.map((entry) => ({
          ...entry,
          tenants: entry.room ? tenants.filter((tenant) => tenant.room_id === entry.room?.id) : [],
        })),
      }))
  }, [floorFilter, floors, rooms, tenants])

  const boarderRows = useMemo(
    () =>
      grouped.flatMap((group) =>
        group.rooms.flatMap((entry) =>
          entry.tenants.map((tenant) => ({
            tenant,
            floorName: group.spec.name,
            roomNumber: entry.spec.roomNumber,
            roomId: entry.room?.id,
            occupied: entry.room?.occupied_spaces ?? entry.tenants.length,
            capacity: entry.spec.capacity,
          })),
        ),
      ),
    [grouped],
  )

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="Boarders, floors, and rooms stay in sync with assignments on the Tenants page."
      />
      {loading || !stats ? (
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Boarders staying" value={tenants.length} />
            <StatCard label="Beds occupied" value={stats.occupiedSpaces} />
            <StatCard label="Beds available" value={stats.availableSpaces} />
            <StatCard label="Total bed capacity" value={stats.totalCapacity} />
          </div>

          <section className="mt-8 rounded-xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-2xl">Occupancy by floor</h2>
              <p className="mt-1 text-sm text-muted">Ground, second, and third floor from the same room layout.</p>
            </div>
            <div className="divide-y divide-line">
              {STANDARD_FLOORS.map((spec) => {
                const floorStats = stats.floors.find((item) => item.floorNumber === spec.floorNumber)
                const occupied = floorStats?.occupiedSpaces ?? 0
                const capacity = floorStats?.capacity ?? 0
                const percent = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0
                return (
                  <div key={spec.floorNumber} className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-medium">{spec.name}</p>
                      <p className="text-sm text-muted">
                        {occupied}/{capacity} occupied · {percent}%
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2">
                      <div className="h-full bg-gold" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mt-8 rounded-xl border border-line bg-white">
            <div className="flex flex-col gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-2xl">Boarders</h2>
                <p className="mt-1 text-sm text-muted">Name, floor, and room from current assignments.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={floorFilter === 'all' ? 'secondary' : 'outline'}
                  onClick={() => setFloorFilter('all')}
                >
                  All floors
                </Button>
                {STANDARD_FLOORS.map((spec) => (
                  <Button
                    key={spec.floorNumber}
                    variant={floorFilter === spec.floorNumber ? 'secondary' : 'outline'}
                    onClick={() => setFloorFilter(spec.floorNumber)}
                  >
                    {spec.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-line text-xs tracking-[0.12em] text-muted uppercase">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Floor</th>
                    <th className="px-5 py-3 font-medium">Room</th>
                    <th className="px-5 py-3 font-medium">Started</th>
                    <th className="px-5 py-3 font-medium">Room occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {boarderRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-muted">
                        No boarders on this floor yet.{' '}
                        <Link to="/admin/tenants" className="text-ink underline decoration-gold underline-offset-4">
                          Assign a tenant
                        </Link>
                      </td>
                    </tr>
                  ) : (
                    boarderRows.map((row) => (
                      <tr key={row.tenant.id} className="border-b border-line/70 last:border-b-0">
                        <td className="px-5 py-3.5 font-medium">{row.tenant.full_name}</td>
                        <td className="px-5 py-3.5 text-muted">{row.floorName}</td>
                        <td className="px-5 py-3.5">
                          {row.roomId ? (
                            <Link
                              to={`/admin/tenants?room=${row.roomId}`}
                              className="underline decoration-gold underline-offset-4"
                            >
                              {row.roomNumber}
                            </Link>
                          ) : (
                            row.roomNumber
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-muted">{formatDate(row.tenant.started_on)}</td>
                        <td className="px-5 py-3.5 text-muted">
                          {row.occupied}/{row.capacity}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 rounded-xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-2xl">Rooms</h2>
              <p className="mt-1 text-sm text-muted">Who is staying in each room, grouped by floor.</p>
            </div>
            {grouped.map((group) => (
              <div key={group.spec.floorNumber} className="border-b border-line last:border-b-0">
                <div className="bg-paper-2 px-5 py-2.5">
                  <p className="text-sm font-medium">{group.spec.name}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs tracking-[0.12em] text-muted uppercase">
                      <tr>
                        <th className="px-5 py-2 font-medium">Room</th>
                        <th className="px-5 py-2 font-medium">Type</th>
                        <th className="px-5 py-2 font-medium">Occupants</th>
                        <th className="px-5 py-2 font-medium">Occupied</th>
                        <th className="px-5 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rooms.map((entry) => {
                        const occupied = entry.room?.occupied_spaces ?? entry.tenants.length
                        const available = getAvailableSpaces(entry.spec.capacity, occupied)
                        const status = getRoomStatus(available)
                        return (
                          <tr key={entry.spec.roomNumber} className="border-t border-line/70">
                            <td className="px-5 py-3 font-medium">
                              {entry.room ? (
                                <Link
                                  to={`/admin/tenants?room=${entry.room.id}`}
                                  className="underline decoration-gold underline-offset-4"
                                >
                                  {entry.spec.roomNumber}
                                </Link>
                              ) : (
                                entry.spec.roomNumber
                              )}
                            </td>
                            <td className="px-5 py-3 text-muted">
                              {roomTypeLabel(entry.spec.roomType, entry.spec.capacity)}
                            </td>
                            <td className="px-5 py-3">
                              {entry.tenants.length > 0 ? (
                                entry.tenants.map((tenant) => tenant.full_name).join(', ')
                              ) : (
                                <span className="text-muted">Vacant</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-muted">
                              {occupied}/{entry.spec.capacity}
                            </td>
                            <td className="px-5 py-3">
                              <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>

          <p className="mt-6 text-sm text-muted">
            Announcements on the website: {announcementCount}. Room photos are managed on the Rooms page.
          </p>
        </>
      )}
    </div>
  )
}
