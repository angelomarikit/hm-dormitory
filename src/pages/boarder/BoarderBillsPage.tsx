import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { useSite } from '@/contexts/SiteContext'
import { useBoarderTenant } from '@/hooks/useBoarderTenant'
import { fetchBillsForTenant, syncLiveBilling } from '@/services/billingService'
import { formatPeso } from '@/utils/money'
import { formatDate } from '@/utils/format'
import type { Bill } from '@/types/ops'

export default function BoarderBillsPage() {
  const { siteId } = useSite()
  const { tenant } = useBoarderTenant()
  const [bills, setBills] = useState<Bill[]>([])

  useEffect(() => {
    if (!siteId || !tenant) return
    void syncLiveBilling(siteId)
      .catch(() => undefined)
      .then(() => fetchBillsForTenant(siteId, tenant.id))
      .then(setBills)
      .catch(() => setBills([]))
  }, [siteId, tenant])

  return (
    <div>
      <h1 className="font-display text-3xl">My bills</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Bill</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">No bills yet.</td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id} className="border-t border-line/70">
                  <td className="px-4 py-3 font-medium">{bill.bill_number}</td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(bill.period_start)} – {formatDate(bill.period_end)}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(bill.due_on)}</td>
                  <td className="px-4 py-3">{formatPeso(bill.total_centavos)}</td>
                  <td className="px-4 py-3">{formatPeso(bill.paid_centavos)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={bill.status === 'paid' ? 'success' : 'neutral'}>{bill.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {bill.status !== 'paid' && bill.status !== 'voided' ? (
                      <Link to="/boarder/pay" className="underline decoration-gold underline-offset-4">Pay</Link>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
