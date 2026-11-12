import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/admin/StatCard'
import { useSite } from '@/contexts/SiteContext'
import { useBoarderTenant } from '@/hooks/useBoarderTenant'
import { fetchBillsForTenant, syncLiveBilling } from '@/services/billingService'
import { fetchNotices, fetchNotifications } from '@/services/commsService'
import { fetchBeds } from '@/services/bedService'
import { formatPeso } from '@/utils/money'
import type { AppNotification, Bill, Notice } from '@/types/ops'

export default function BoarderHomePage() {
  const { site, siteId } = useSite()
  const { tenant, boarderProfile } = useBoarderTenant()
  const [bills, setBills] = useState<Bill[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [alerts, setAlerts] = useState<AppNotification[]>([])
  const [bedCode, setBedCode] = useState<string | null>(null)

  useEffect(() => {
    if (!siteId || !tenant) return
    void syncLiveBilling(siteId)
      .catch(() => undefined)
      .then(() => fetchBillsForTenant(siteId, tenant.id))
      .then(setBills)
      .catch(() => setBills([]))
    void fetchNotices(siteId).then(setNotices).catch(() => setNotices([]))
    void fetchNotifications()
      .then((items) => setAlerts(items.filter((item) => !item.is_read)))
      .catch(() => setAlerts([]))
    if (tenant.bed_id) {
      void fetchBeds(siteId)
        .then((beds) => setBedCode(beds.find((bed) => bed.id === tenant.bed_id)?.bed_code ?? null))
        .catch(() => setBedCode(null))
    }
  }, [siteId, tenant])

  const open = bills.filter((bill) => bill.status !== 'paid' && bill.status !== 'voided')
  const balance = open.reduce((sum, bill) => sum + Math.max(0, bill.total_centavos - bill.paid_centavos), 0)

  return (
    <div>
      <p className="text-xs tracking-[0.22em] text-gold uppercase">{site?.name}</p>
      <h1 className="mt-2 font-display text-3xl">Hello{tenant ? `, ${tenant.full_name}` : ''}</h1>
      <p className="mt-2 text-sm text-muted">
        Room {tenant?.rooms?.room_number ?? '—'} {bedCode ? `· Bed ${bedCode}` : ''} · {boarderProfile?.occupancy_type ?? 'Boarder'}
      </p>
      {alerts.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-line bg-ink px-5 py-4 text-white">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Due reminder</p>
          <p className="mt-2 text-sm">{alerts[0].title}</p>
          <p className="mt-1 text-sm text-white/70">{alerts[0].body}</p>
          <Link to="/boarder/bills" className="mt-3 inline-block text-sm text-gold underline underline-offset-4">
            View bills
          </Link>
        </section>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Open balance" value={formatPeso(balance)} />
        <StatCard label="Open bills" value={open.length} />
        <StatCard label="Notices" value={notices.length} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link to="/boarder/bills" className="underline decoration-gold underline-offset-4">My bills</Link>
        <Link to="/boarder/pay" className="underline decoration-gold underline-offset-4">Pay now</Link>
        <Link to="/boarder/notices" className="underline decoration-gold underline-offset-4">Notices</Link>
      </div>
    </div>
  )
}
