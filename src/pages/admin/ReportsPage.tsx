import { useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { StatCard } from '@/components/admin/StatCard'
import { Button } from '@/components/ui/Button'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchBills } from '@/services/billingService'
import { fetchPayments } from '@/services/paymentService'
import { fetchAllRooms } from '@/services/roomService'
import { fetchActiveTenants } from '@/services/tenantService'
import { formatPeso } from '@/utils/money'
import { toUserMessage } from '@/lib/errors'
import type { Bill, Payment } from '@/types/ops'

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
}

export default function ReportsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [bills, setBills] = useState<Bill[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [occupied, setOccupied] = useState(0)
  const [capacity, setCapacity] = useState(0)
  const [boarders, setBoarders] = useState(0)

  useEffect(() => {
    if (!siteId) return
    void Promise.all([fetchBills(siteId), fetchPayments(siteId), fetchAllRooms(siteId), fetchActiveTenants(siteId)])
      .then(([nextBills, nextPayments, rooms, tenants]) => {
        setBills(nextBills)
        setPayments(nextPayments)
        setOccupied(rooms.filter((r) => r.is_active).reduce((s, r) => s + r.occupied_spaces, 0))
        setCapacity(rooms.filter((r) => r.is_active).reduce((s, r) => s + r.capacity, 0))
        setBoarders(tenants.length)
      })
      .catch((error) => toast.error(toUserMessage(error, 'Unable to load reports.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  const confirmed = payments.filter((p) => p.status === 'confirmed')
  const expected = bills.reduce((s, b) => s + b.total_centavos, 0)
  const collected = confirmed.reduce((s, p) => s + p.amount_centavos, 0)
  const outstanding = bills.reduce((s, b) => s + Math.max(0, b.total_centavos - b.paid_centavos), 0)

  const csv = useMemo(
    () =>
      toCsv([
        ['Bill', 'Status', 'Total centavos', 'Paid centavos'],
        ...bills.map((b) => [b.bill_number, b.status, String(b.total_centavos), String(b.paid_centavos)]),
      ]),
    [bills],
  )

  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description="Figures use confirmed payments only. Pending receipts are not counted as collected."
        action={
          <Button
            variant="outline"
            onClick={() => {
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'hm-dormitory-bills.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export bills CSV
          </Button>
        }
      />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Expected billed" value={formatPeso(expected)} />
        <StatCard label="Collected (confirmed)" value={formatPeso(collected)} />
        <StatCard label="Outstanding" value={formatPeso(outstanding)} />
        <StatCard label="Occupancy" value={`${capacity ? Math.round((occupied / capacity) * 100) : 0}%`} />
      </div>
      <p className="mt-6 text-sm text-muted">{boarders} active boarders · {occupied}/{capacity} beds occupied.</p>
    </div>
  )
}
