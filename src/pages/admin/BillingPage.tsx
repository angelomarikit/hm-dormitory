import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchBills, syncLiveBilling } from '@/services/billingService'
import { fetchActiveTenants } from '@/services/tenantService'
import { formatPeso } from '@/utils/money'
import { formatDate } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { Bill } from '@/types/ops'
import type { TenantWithRoom } from '@/types/database'

export default function BillingPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [bills, setBills] = useState<Bill[]>([])
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])

  async function load() {
    if (!siteId) return
    await syncLiveBilling(siteId)
    setBills(await fetchBills(siteId))
    setTenants(await fetchActiveTenants(siteId))
  }

  useEffect(() => {
    void load().catch((error) => toast.error(toUserMessage(error, 'Unable to load bills.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  function tenantName(id: string) {
    return tenants.find((item) => item.id === id)?.full_name ?? id.slice(0, 8)
  }

  return (
    <div>
      <AdminPageHeader
        title="Billing"
        description="Bills refresh live for every occupied bed. Rent is due at the end of the month. Empty beds are not billed."
      />
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3">Boarder</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-t border-line/70">
                <td className="px-4 py-3 font-medium">{bill.bill_number}</td>
                <td className="px-4 py-3">{tenantName(bill.tenant_id)}</td>
                <td className="px-4 py-3 text-muted">
                  {formatDate(bill.period_start)} – {formatDate(bill.period_end)}
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(bill.due_on)}</td>
                <td className="px-4 py-3">{formatPeso(bill.total_centavos)}</td>
                <td className="px-4 py-3">{formatPeso(bill.paid_centavos)}</td>
                <td className="px-4 py-3">
                  <Badge tone={bill.status === 'paid' ? 'success' : bill.status === 'overdue' ? 'full' : 'neutral'}>
                    {bill.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
