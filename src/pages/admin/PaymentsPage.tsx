import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { confirmPayment, fetchPayments, rejectPayment } from '@/services/paymentService'
import { fetchActiveTenants } from '@/services/tenantService'
import {
  fetchBillingSettings,
  savePaymentInstructions,
} from '@/services/billingService'
import { logActivity } from '@/services/commsService'
import { deleteSiteAssetByUrl, uploadSiteAsset } from '@/services/storageService'
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
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [savingQr, setSavingQr] = useState(false)
  const [editingQr, setEditingQr] = useState(false)

  async function load() {
    if (!siteId) return
    const [payments, tenants, nextSettings] = await Promise.all([
      fetchPayments(siteId),
      fetchActiveTenants(siteId),
      fetchBillingSettings(siteId).catch(() => null),
    ])
    setItems(payments)
    setNames(Object.fromEntries(tenants.map((t) => [t.id, t.full_name])))
    setQrUrl(nextSettings?.payment_qr_url ?? null)
    setAccountName(nextSettings?.payment_account_name ?? '')
    setAccountNumber(nextSettings?.payment_account_number ?? '')
    setNotes(nextSettings?.payment_notes ?? '')
  }

  useEffect(() => {
    void load().catch((error) => toast.error(toUserMessage(error, 'Unable to load payments.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  return (
    <div>
      <AdminPageHeader
        title="Payments"
        description="Only confirmed payments change a boarder’s balance. QR and account details sit in the strip above the list."
      />

      <section className="mt-6 max-w-xl rounded-xl border border-line bg-white">
        <div className="flex items-center gap-4 px-4 py-3">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="Payment QR"
              className="h-16 w-16 shrink-0 rounded-md border border-line bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-line text-[10px] text-muted">
              QR
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.16em] text-gold uppercase">Shown to boarders</p>
            <p className="truncate text-sm font-medium">{accountName || 'No account name yet'}</p>
            <p className="truncate text-xs text-muted">{accountNumber || 'No account number yet'}</p>
          </div>
          <Button variant="outline" onClick={() => setEditingQr(true)}>
            Edit
          </Button>
        </div>
      </section>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-white">
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
      <Modal open={editingQr} title="Payment QR and account" onClose={() => setEditingQr(false)}>
        <div className="grid gap-4">
          <p className="text-sm text-muted">
            Boarders see this when they pay. Keep the QR and a backup account name and number.
          </p>
          <ImageUpload
            label="QR code"
            hint="JPG, PNG, or WebP of the GCash / Maya / bank QR."
            value={qrUrl}
            uploading={uploading}
            fit="contain"
            onSelect={(file) => {
              if (!siteId) return
              void (async () => {
                setUploading(true)
                try {
                  const url = await uploadSiteAsset(siteId, 'payments', file)
                  if (qrUrl) await deleteSiteAssetByUrl(qrUrl)
                  setQrUrl(url)
                } catch (error) {
                  toast.error(toUserMessage(error, 'Unable to upload QR.'))
                } finally {
                  setUploading(false)
                }
              })()
            }}
            onRemove={() => {
              if (qrUrl) void deleteSiteAssetByUrl(qrUrl)
              setQrUrl(null)
            }}
          />
          <Input
            label="Account name"
            value={accountName}
            onChange={(event) => setAccountName(event.target.value)}
            placeholder="Name on GCash / bank account"
          />
          <Input
            label="Account number"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            placeholder="Mobile or account number"
          />
          <Textarea
            label="Additional information"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Bank name, remarks, or backup instructions"
          />
          <Button
            disabled={savingQr}
            onClick={async () => {
              if (!siteId) return
              setSavingQr(true)
              try {
                await savePaymentInstructions(siteId, {
                  payment_qr_url: qrUrl,
                  payment_account_name: accountName,
                  payment_account_number: accountNumber,
                  payment_notes: notes,
                })
                toast.success('Payment details saved. Boarders will see this when they pay.')
                setEditingQr(false)
              } catch (error) {
                toast.error(toUserMessage(error, 'Unable to save payment details.'))
              } finally {
                setSavingQr(false)
              }
            }}
          >
            {savingQr ? 'Saving…' : 'Save payment details'}
          </Button>
        </div>
      </Modal>
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
