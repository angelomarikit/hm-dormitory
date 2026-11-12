import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { useBoarderTenant } from '@/hooks/useBoarderTenant'
import { createMaintenance, fetchMaintenance } from '@/services/commsService'
import { formatDateTime } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { MaintenanceRequest } from '@/types/ops'

export default function BoarderMaintenancePage() {
  const { siteId } = useSite()
  const toast = useToast()
  const { tenant } = useBoarderTenant()
  const [items, setItems] = useState<MaintenanceRequest[]>([])
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')

  async function load() {
    if (!siteId) return
    const all = await fetchMaintenance(siteId)
    setItems(tenant ? all.filter((item) => item.tenant_id === tenant.id) : all)
  }

  useEffect(() => {
    void load().catch(() => setItems([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, tenant?.id])

  return (
    <div>
      <h1 className="font-display text-3xl">Maintenance</h1>
      <form
        className="mt-6 grid max-w-lg gap-4 rounded-xl border border-line bg-white p-5"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!siteId || !tenant) return
          try {
            await createMaintenance({
              siteId,
              tenantId: tenant.id,
              roomId: tenant.room_id,
              title,
              details,
            })
            toast.success('Request submitted.')
            setTitle('')
            setDetails('')
            await load()
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to submit request.'))
          }
        }}
      >
        <Input label="What’s wrong?" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea label="Details" value={details} onChange={(e) => setDetails(e.target.value)} />
        <Button type="submit">Submit request</Button>
      </form>
      <div className="mt-8 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-medium">{item.title}</h2>
              <Badge>{item.status}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted">{item.details}</p>
            <p className="mt-2 text-xs text-muted">{formatDateTime(item.created_at)}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
