import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { confirmPayment, fetchPayments, rejectPayment } from '@/services/paymentService'
import { fetchActiveTenants } from '@/services/tenantService'
import { logActivity } from '@/services/commsService'
import { formatPeso } from '@/utils/money'
import { formatDate } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { Payment } from '@/types/ops'

export default function PaymentsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [items, setItems] = useState<Payment[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [rejecting, setRejecting] = useState<Payment | null>(null)
  const [reason, setReason] = useState('')

  async function load() {
    if (!siteId) return
    const [payments, tenants] = await Promise.all([fetchPayments(siteId), fetchActiveTenants(siteId)])
    setItems(payments)
    setNames(Object.fromEntries(tenants.map((t) => [t.id, t.full_name])))
  }

  useEffect(() => {
    void load().catch((error) => toast.error(toUserMessage(error, 'Unable to load payments.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  return (
    <div>
      <AdminPageHeader title="Payments" description="Only confirmed payments change a boarder’s balance." />
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Boarder</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line/70">
                <td className="px-4 py-3">{names[item.tenant_id] ?? 'Boarder'}</td>
                <td className="px-4 py-3 uppercase">{item.method}</td>
                <td className="px-4 py-3">{formatPeso(item.amount_centavos)}</td>
                <td className="px-4 py-3 text-muted">{item.reference_number || '—'}</td>
                <td className="px-4 py-3 text-muted">{formatDate(item.paid_on)}</td>
                <td className="px-4 py-3">
                  <Badge tone={item.status === 'confirmed' ? 'success' : 'neutral'}>{item.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  {item.status === 'pending_verification' ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (!siteId) return
                          try {
                            await confirmPayment(item.id)
                            await logActivity(siteId, 'payment_confirmed', 'payment', item.id, String(item.amount_centavos))
                            toast.success('Payment confirmed.')
                            await load()
                          } catch (error) {
                            toast.error(toUserMessage(error, 'Unable to confirm.'))
                          }
                        }}
                      >
                        Approve
                      </Button>
                      <Button variant="danger" onClick={() => { setRejecting(item); setReason(''); }}>
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={Boolean(rejecting)} title="Reject payment" onClose={() => setRejecting(null)}>
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button
          className="mt-4"
          variant="danger"
          onClick={async () => {
            if (!rejecting || !siteId) return
            try {
              await rejectPayment(rejecting.id, reason)
              toast.success('Payment rejected.')
              setRejecting(null)
              await load()
            } catch (error) {
              toast.error(toUserMessage(error, 'Unable to reject.'))
            }
          }}
        >
          Reject
        </Button>
      </Modal>
    </div>
  )
}
