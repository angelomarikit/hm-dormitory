import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { useSite } from '@/contexts/SiteContext'
import { useBoarderTenant } from '@/hooks/useBoarderTenant'
import { fetchPaymentsForTenant } from '@/services/paymentService'
import { formatPeso } from '@/utils/money'
import { formatDate } from '@/utils/format'
import type { Payment } from '@/types/ops'

export default function BoarderHistoryPage() {
  const { siteId } = useSite()
  const { tenant } = useBoarderTenant()
  const [items, setItems] = useState<Payment[]>([])

  useEffect(() => {
    if (!siteId || !tenant) return
    void fetchPaymentsForTenant(siteId, tenant.id).then(setItems).catch(() => setItems([]))
  }, [siteId, tenant])

  return (
    <div>
      <h1 className="font-display text-3xl">Payment history</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">No payments yet.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-line/70">
                  <td className="px-4 py-3 text-muted">{formatDate(item.paid_on)}</td>
                  <td className="px-4 py-3 uppercase">{item.method}</td>
                  <td className="px-4 py-3">{formatPeso(item.amount_centavos)}</td>
                  <td className="px-4 py-3 text-muted">{item.reference_number || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={item.status === 'confirmed' ? 'success' : 'neutral'}>{item.status}</Badge>
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
