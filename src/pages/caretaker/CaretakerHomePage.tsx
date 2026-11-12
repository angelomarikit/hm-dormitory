import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/admin/StatCard'
import { useSite } from '@/contexts/SiteContext'
import { fetchAllRooms } from '@/services/roomService'
import { fetchActiveTenants } from '@/services/tenantService'
import { fetchMaintenance } from '@/services/commsService'

export default function CaretakerHomePage() {
  const { siteId } = useSite()
  const [boarders, setBoarders] = useState(0)
  const [occupied, setOccupied] = useState(0)
  const [capacity, setCapacity] = useState(0)
  const [openTickets, setOpenTickets] = useState(0)

  useEffect(() => {
    if (!siteId) return
    void Promise.all([fetchActiveTenants(siteId), fetchAllRooms(siteId), fetchMaintenance(siteId)])
      .then(([tenants, rooms, tickets]) => {
        setBoarders(tenants.length)
        const active = rooms.filter((room) => room.is_active)
        setOccupied(active.reduce((sum, room) => sum + room.occupied_spaces, 0))
        setCapacity(active.reduce((sum, room) => sum + room.capacity, 0))
        setOpenTickets(tickets.filter((item) => item.status !== 'resolved' && item.status !== 'cancelled').length)
      })
      .catch(() => undefined)
  }, [siteId])

  return (
    <div>
      <h1 className="font-display text-3xl">Caretaker</h1>
      <p className="mt-2 text-sm text-muted">View assignments, collect cash, and follow maintenance. Website content stays with administrators.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Boarders staying" value={boarders} />
        <StatCard label="Beds occupied" value={occupied} />
        <StatCard label="Capacity" value={capacity} />
        <StatCard label="Open maintenance" value={openTickets} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link to="/caretaker/boarders" className="underline decoration-gold underline-offset-4">Boarders</Link>
        <Link to="/caretaker/collections" className="underline decoration-gold underline-offset-4">Cash collection</Link>
        <Link to="/caretaker/maintenance" className="underline decoration-gold underline-offset-4">Maintenance</Link>
      </div>
    </div>
  )
}
