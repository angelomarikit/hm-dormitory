import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchMaintenance, setMaintenanceStatus } from '@/services/commsService'
import { fetchActiveTenants } from '@/services/tenantService'
import { formatDateTime } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { MaintenanceRequest } from '@/types/ops'

export default function CaretakerMaintenancePage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [items, setItems] = useState<MaintenanceRequest[]>([])
  const [names, setNames] = useState<Record<string, string>>({})

  async function load() {
    if (!siteId) return
    const [tickets, tenants] = await Promise.all([fetchMaintenance(siteId), fetchActiveTenants(siteId)])
    setItems(tickets)
    setNames(Object.fromEntries(tenants.map((tenant) => [tenant.id, tenant.full_name])))
  }

  useEffect(() => {
    void load().catch(() => setItems([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  return (
    <div>
      <h1 className="font-display text-3xl">Maintenance</h1>
      <div className="mt-6 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{item.title}</h2>
                <p className="text-sm text-muted">{names[item.tenant_id] ?? 'Boarder'}</p>
              </div>
              <Badge>{item.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{item.details}</p>
            <p className="mt-2 text-xs text-muted">{formatDateTime(item.created_at)}</p>
            <Select
              className="mt-3"
              label="Status"
              value={item.status}
              onChange={async (event) => {
                if (!siteId) return
                try {
                  await setMaintenanceStatus(item.id, siteId, event.target.value)
                  toast.success('Updated.')
                  await load()
                } catch (error) {
                  toast.error(toUserMessage(error, 'Unable to update.'))
                }
              }}
            >
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            {item.status === 'open' ? (
              <Button
                className="mt-3"
                variant="outline"
                onClick={async () => {
                  if (!siteId) return
                  await setMaintenanceStatus(item.id, siteId, 'in_progress')
                  await load()
                }}
              >
                Start work
              </Button>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
