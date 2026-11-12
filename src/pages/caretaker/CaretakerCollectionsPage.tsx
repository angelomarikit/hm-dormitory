import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchBills } from '@/services/billingService'
import { recordCashCollection } from '@/services/paymentService'
import { fetchActiveTenants } from '@/services/tenantService'
import { logActivity } from '@/services/commsService'
import { formatPeso, parsePesoInput } from '@/utils/money'
import { todayISO } from '@/utils/format'
import { toUserMessage } from '@/lib/errors'
import type { Bill } from '@/types/ops'
import type { TenantWithRoom } from '@/types/database'

export default function CaretakerCollectionsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [tenantId, setTenantId] = useState('')
  const [billId, setBillId] = useState('')
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(todayISO())
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!siteId) return
    void Promise.all([fetchActiveTenants(siteId), fetchBills(siteId)])
      .then(([nextTenants, nextBills]) => {
        setTenants(nextTenants)
        setBills(nextBills.filter((bill) => bill.status !== 'paid' && bill.status !== 'voided'))
      })
      .catch(() => undefined)
  }, [siteId])

  const openBills = bills.filter((bill) => bill.tenant_id === tenantId)

  return (
    <div>
      <h1 className="font-display text-3xl">Cash collection</h1>
      <p className="mt-2 text-sm text-muted">Record cash received in person. This confirms immediately.</p>
      <form
        className="mt-6 grid max-w-lg gap-4 rounded-xl border border-line bg-white p-5"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!siteId) return
          try {
            await recordCashCollection({
              siteId,
              tenantId,
              billId,
              amountCentavos: parsePesoInput(amount),
              paidOn,
              notes,
            })
            await logActivity(siteId, 'cash_collected', 'payment', billId, amount)
            toast.success('Cash collection recorded.')
            setAmount('')
            setNotes('')
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to record cash.'))
          }
        }}
      >
        <Select label="Boarder" value={tenantId} onChange={(e) => { setTenantId(e.target.value); setBillId(''); }}>
          <option value="">Select boarder</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>{tenant.full_name}</option>
          ))}
        </Select>
        <Select label="Bill" value={billId} onChange={(e) => setBillId(e.target.value)}>
          <option value="">Select bill</option>
          {openBills.map((bill) => (
            <option key={bill.id} value={bill.id}>
              {bill.bill_number} · {formatPeso(bill.total_centavos - bill.paid_centavos)} remaining
            </option>
          ))}
        </Select>
        <Input label="Amount (PHP)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <Input label="Date received" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button type="submit">Record cash</Button>
      </form>
    </div>
  )
}
