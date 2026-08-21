import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatCard } from '@/components/admin/StatCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSite } from '@/contexts/SiteContext'
import { fetchAllAnnouncements } from '@/services/announcementService'
import { fetchAllFloors } from '@/services/floorService'
import { buildAvailabilitySummary, fetchAllRooms } from '@/services/roomService'

export default function DashboardPage() {
  const { siteId } = useSite()
  const [loading, setLoading] = useState(true)
  const [announcementCount, setAnnouncementCount] = useState(0)
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalCapacity: 0,
    occupiedSpaces: 0,
    availableSpaces: 0,
    availableRooms: 0,
    limitedRooms: 0,
    fullRooms: 0,
  })

  useEffect(() => {
    if (!siteId) return
    const id: string = siteId
    let cancelled = false

    async function load(currentSiteId: string) {
      setLoading(true)
      try {
        const [rooms, floors, announcements] = await Promise.all([
          fetchAllRooms(currentSiteId),
          fetchAllFloors(currentSiteId),
          fetchAllAnnouncements(currentSiteId),
        ])
        if (cancelled) return
        const summary = buildAvailabilitySummary(rooms, floors)
        setStats(summary)
        setAnnouncementCount(announcements.length)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load(id)
    return () => {
      cancelled = true
    }
  }, [siteId])

  return (
    <div>
      <AdminPageHeader
        title="Dashboard"
        description="A quick look at rooms, occupancy, and announcements."
      />
      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Rooms" value={stats.totalRooms} />
          <StatCard label="Total Bed Capacity" value={stats.totalCapacity} />
          <StatCard label="Occupied Spaces" value={stats.occupiedSpaces} />
          <StatCard label="Available Spaces" value={stats.availableSpaces} />
          <StatCard label="Available Rooms" value={stats.availableRooms} />
          <StatCard label="Limited Rooms" value={stats.limitedRooms} />
          <StatCard label="Full Rooms" value={stats.fullRooms} />
          <StatCard label="Announcements" value={announcementCount} />
        </div>
      )}
    </div>
  )
}
