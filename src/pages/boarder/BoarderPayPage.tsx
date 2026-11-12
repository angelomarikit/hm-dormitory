import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { useBoarderTenant } from '@/hooks/useBoarderTenant'
import { fetchBillsForTenant } from '@/services/billingService'
import { submitEwalletPayment } from '@/services/paymentService'
import { formatPeso, parsePesoInput } from '@/utils/money'
import { toUserMessage } from '@/lib/errors'
import type { Bill, PaymentMethod } from '@/types/ops'

export default function BoarderPayPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const { tenant } = useBoarderTenant()
  const [bills, setBills] = useState<Bill[]>([])
  const [billId, setBillId] = useState('')
  const [method, setMethod] = useState<Exclude<PaymentMethod, 'cash'>>('gcash')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!siteId || !tenant) return
    void fetchBillsForTenant(siteId, tenant.id)
      .then((list) => {
        const open = list.filter((bill) => bill.status !== 'paid' && bill.status !== 'voided')
        setBills(open)
        setBillId((current) => current || open[0]?.id || '')
      })
      .catch(() => setBills([]))
  }, [siteId, tenant])

  const selected = bills.find((bill) => bill.id === billId)
  const remaining = selected ? Math.max(0, selected.total_centavos - selected.paid_centavos) : 0

  return (
    <div>
      <h1 className="font-display text-3xl">Pay a bill</h1>
      <p className="mt-2 text-sm text-muted">Upload a GCash, Maya, or QR Ph receipt. It stays pending until an administrator confirms it.</p>
      <form
        className="mt-6 grid max-w-lg gap-4 rounded-xl border border-line bg-white p-5"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!siteId || !tenant || !file || !billId) return
          setSaving(true)
          try {
            await submitEwalletPayment({
              siteId,
              tenantId: tenant.id,
              billId,
              amountCentavos: parsePesoInput(amount) || remaining,
              method,
              referenceNumber: reference,
              file,
            })
            toast.success('Receipt submitted for verification.')
            setReference('')
            setAmount('')
            setFile(null)
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to submit payment.'))
          } finally {
            setSaving(false)
          }
        }}
      >
        <Select label="Bill" value={billId} onChange={(e) => setBillId(e.target.value)}>
          {bills.length === 0 ? <option value="">No open bills</option> : null}
          {bills.map((bill) => (
            <option key={bill.id} value={bill.id}>
              {bill.bill_number} · {formatPeso(bill.total_centavos - bill.paid_centavos)} remaining
            </option>
          ))}
        </Select>
        <Select label="Method" value={method} onChange={(e) => setMethod(e.target.value as Exclude<PaymentMethod, 'cash'>)}>
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="qrph">QR Ph</option>
        </Select>
        <Input label="Amount (PHP)" value={amount} placeholder={remaining ? String(remaining / 100) : ''} onChange={(e) => setAmount(e.target.value)} />
        <Input label="E-wallet reference" value={reference} onChange={(e) => setReference(e.target.value)} required />
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Receipt photo or PDF</span>
          <input type="file" accept="image/*,.pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Button type="submit" disabled={saving || !bills.length}>
          {saving ? 'Submitting…' : 'Submit for verification'}
        </Button>
      </form>
    </div>
  )
}
