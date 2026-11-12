import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { useSite } from '@/contexts/SiteContext'
import { fetchActivityLogs } from '@/services/commsService'
import { formatDateTime } from '@/utils/format'
import type { ActivityLog } from '@/types/ops'

export default function ActivityPage() {
  const { siteId } = useSite()
  const [items, setItems] = useState<ActivityLog[]>([])

  useEffect(() => {
    if (!siteId) return
    void fetchActivityLogs(siteId).then(setItems).catch(() => setItems([]))
  }, [siteId])

  return (
    <div>
      <AdminPageHeader title="Activity logs" description="Recorded account and payment actions." />
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line/70">
                <td className="px-4 py-3 text-muted">{formatDateTime(item.created_at)}</td>
                <td className="px-4 py-3 font-medium">{item.action}</td>
                <td className="px-4 py-3 text-muted">{item.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
