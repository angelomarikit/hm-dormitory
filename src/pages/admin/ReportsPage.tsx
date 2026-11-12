import { useEffect, useMemo, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchBills, syncLiveBilling } from '@/services/billingService'
import { fetchPayments } from '@/services/paymentService'
import { fetchAllRooms } from '@/services/roomService'
import { fetchActiveTenants } from '@/services/tenantService'
import { STANDARD_FLOORS } from '@/data/standardRooms'
import { formatDate } from '@/utils/format'
import { formatPeso } from '@/utils/money'
import { toUserMessage } from '@/lib/errors'
import type { Bill, Payment } from '@/types/ops'
import type { TenantWithRoom } from '@/types/database'

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
}

function monthStartISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

export default function ReportsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [bills, setBills] = useState<Bill[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [occupied, setOccupied] = useState(0)
  const [capacity, setCapacity] = useState(0)

  useEffect(() => {
    if (!siteId) return
    void (async () => {
      try {
        await syncLiveBilling(siteId).catch(() => undefined)
        const [nextBills, nextPayments, rooms, nextTenants] = await Promise.all([
          fetchBills(siteId),
          fetchPayments(siteId),
          fetchAllRooms(siteId),
          fetchActiveTenants(siteId),
        ])
        setBills(nextBills)
        setPayments(nextPayments)
        setTenants(nextTenants)
        const activeRooms = rooms.filter((room) => room.is_active)
        setOccupied(activeRooms.reduce((sum, room) => sum + room.occupied_spaces, 0))
        setCapacity(activeRooms.reduce((sum, room) => sum + room.capacity, 0))
      } catch (error) {
        toast.error(toUserMessage(error, 'Unable to load reports.'))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  const period = monthStartISO()
  const monthBills = bills.filter((bill) => bill.period_start.slice(0, 7) === period.slice(0, 7))
  const confirmed = payments.filter((item) => item.status === 'confirmed')
  const monthCollected = confirmed
    .filter((item) => item.paid_on.slice(0, 7) === period.slice(0, 7))
    .reduce((sum, item) => sum + item.amount_centavos, 0)
  const expected = monthBills.reduce((sum, bill) => sum + bill.total_centavos, 0)
  const outstanding = monthBills.reduce(
    (sum, bill) => sum + Math.max(0, bill.total_centavos - bill.paid_centavos),
    0,
  )
  const collectionRate = expected > 0 ? Math.round((monthCollected / expected) * 100) : 0
  const occupancyRate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0

  const unpaid = monthBills
    .filter((bill) => bill.status !== 'paid' && bill.status !== 'voided' && bill.total_centavos > bill.paid_centavos)
    .map((bill) => ({
      bill,
      tenant: tenants.find((item) => item.id === bill.tenant_id),
    }))

  const csv = useMemo(
    () =>
      toCsv([
        ['Bill', 'Boarder', 'Status', 'Due', 'Total PHP', 'Paid PHP'],
        ...bills.map((bill) => [
          bill.bill_number,
          tenants.find((item) => item.id === bill.tenant_id)?.full_name ?? '',
          bill.status,
          bill.due_on,
          String(bill.total_centavos / 100),
          String(bill.paid_centavos / 100),
        ]),
      ]),
    [bills, tenants],
  )

  return (
    <div>
      <AdminPageHeader
        title="Reports"
        description="Live figures from occupied beds this month. Confirmed payments only count as collected."
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

      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-ink text-white">
        <div className="px-6 py-6 sm:px-8">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">This month</p>
          <p className="mt-2 font-display text-4xl">{formatPeso(expected)} billed</p>
          <p className="mt-2 text-sm text-white/70">
            {tenants.length} boarders · {occupied}/{capacity} beds occupied · due at month end
          </p>
        </div>
        <div className="grid gap-px bg-white/10 sm:grid-cols-4">
          <Metric label="Collected" value={formatPeso(monthCollected)} />
          <Metric label="Outstanding" value={formatPeso(outstanding)} />
          <Metric label="Collection rate" value={`${collectionRate}%`} />
          <Metric label="Occupancy" value={`${occupancyRate}%`} />
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-line bg-white p-6">
          <p className="text-xs tracking-[0.16em] text-gold uppercase">Occupancy by floor</p>
          <div className="mt-4 space-y-4">
            {STANDARD_FLOORS.map((spec) => {
              const floorTenants = tenants.filter(
                (tenant) => tenant.rooms?.floors?.floor_number === spec.floorNumber,
              )
              const percent = tenants.length ? Math.round((floorTenants.length / tenants.length) * 100) : 0
              return (
                <div key={spec.floorNumber}>
                  <div className="flex justify-between text-sm">
                    <span>{spec.name}</span>
                    <span className="text-muted">{floorTenants.length} boarders</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full bg-gold" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-white p-6">
          <p className="text-xs tracking-[0.16em] text-gold uppercase">Unpaid this month</p>
          {unpaid.length === 0 ? (
            <p className="mt-6 text-sm text-muted">All current bills are settled.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {unpaid.map(({ bill, tenant }) => (
                <li key={bill.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{tenant?.full_name ?? 'Boarder'}</p>
                    <p className="text-xs text-muted">
                      Room {tenant?.rooms?.room_number ?? '—'} · due {formatDate(bill.due_on)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">{formatPeso(bill.total_centavos - bill.paid_centavos)}</p>
                    <Badge tone={bill.status === 'overdue' ? 'full' : 'limited'}>{bill.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink px-6 py-5">
      <p className="text-xs tracking-[0.16em] text-gold uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
    </div>
  )
}
