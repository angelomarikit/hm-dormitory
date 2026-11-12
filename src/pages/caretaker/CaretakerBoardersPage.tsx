import { useEffect, useState } from 'react'
import { useSite } from '@/contexts/SiteContext'
import { fetchBeds } from '@/services/bedService'
import { fetchActiveTenants } from '@/services/tenantService'
import { formatDate } from '@/utils/format'
import type { Bed } from '@/types/ops'
import type { TenantWithRoom } from '@/types/database'

export default function CaretakerBoardersPage() {
  const { siteId } = useSite()
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [beds, setBeds] = useState<Bed[]>([])

  useEffect(() => {
    if (!siteId) return
    void Promise.all([fetchActiveTenants(siteId), fetchBeds(siteId)])
      .then(([nextTenants, nextBeds]) => {
        setTenants(nextTenants)
        setBeds(nextBeds)
      })
      .catch(() => undefined)
  }, [siteId])

  function bedCode(id: string | null) {
    return beds.find((bed) => bed.id === id)?.bed_code ?? '—'
  }

  return (
    <div>
      <h1 className="font-display text-3xl">Boarders</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Bed</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Phone</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-t border-line/70">
                <td className="px-4 py-3 font-medium">{tenant.full_name}</td>
                <td className="px-4 py-3">{tenant.rooms?.room_number ?? '—'}</td>
                <td className="px-4 py-3">{bedCode(tenant.bed_id)}</td>
                <td className="px-4 py-3 text-muted">{formatDate(tenant.started_on)}</td>
                <td className="px-4 py-3 text-muted">{tenant.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
