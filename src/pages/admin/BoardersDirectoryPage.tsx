import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchBeds } from '@/services/bedService'
import { fetchBills, syncLiveBilling } from '@/services/billingService'
import { fetchBoarderProfiles, fetchAllTenants } from '@/services/tenantService'
import { formatDate } from '@/utils/format'
import { formatPeso } from '@/utils/money'
import { toUserMessage } from '@/lib/errors'
import { toDisplayUsername } from '@/lib/authIdentity'
import type { TenantWithRoom } from '@/types/database'
import type { Bed, Bill, BoarderProfile } from '@/types/ops'

export default function BoardersDirectoryPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [profiles, setProfiles] = useState<BoarderProfile[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [open, setOpen] = useState<TenantWithRoom | null>(null)

  async function load() {
    if (!siteId) return
    setLoading(true)
    try {
      await syncLiveBilling(siteId).catch(() => undefined)
      const [nextTenants, nextProfiles, nextBeds, nextBills] = await Promise.all([
        fetchAllTenants(siteId),
        fetchBoarderProfiles(siteId).catch(() => [] as BoarderProfile[]),
        fetchBeds(siteId).catch(() => [] as Bed[]),
        fetchBills(siteId).catch(() => [] as Bill[]),
      ])
      setTenants(nextTenants.filter((item) => item.is_active))
      setProfiles(nextProfiles)
      setBeds(nextBeds)
      setBills(nextBills)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to load boarders from the database.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tenants.filter((tenant) => {
      if (!needle) return true
      return `${tenant.full_name} ${tenant.email ?? ''} ${tenant.phone ?? ''} ${tenant.rooms?.room_number ?? ''}`
        .toLowerCase()
        .includes(needle)
    })
  }, [query, tenants])

  function profileFor(tenant: TenantWithRoom) {
    return (
      profiles.find((item) => item.tenant_id === tenant.id) ??
      profiles.find((item) => item.user_id && item.user_id === tenant.user_id)
    )
  }

  function billsFor(tenantId: string) {
    return bills.filter((bill) => bill.tenant_id === tenantId)
  }

  function paymentLabel(tenantId: string) {
    const openBills = billsFor(tenantId).filter(
      (bill) => bill.status !== 'paid' && bill.status !== 'voided' && bill.total_centavos > bill.paid_centavos,
    )
    if (openBills.length === 0) return 'Paid up'
    if (openBills.some((bill) => bill.status === 'overdue')) return 'Overdue'
    return 'Unpaid'
  }

  const selected = open
  const selectedProfile = selected ? profileFor(selected) : null
  const selectedBills = selected ? billsFor(selected.id) : []
  const selectedBed = selected?.bed_id ? beds.find((bed) => bed.id === selected.bed_id) : null

  return (
    <div>
      <AdminPageHeader
        title="Boarder directory"
        description="Every assigned boarder is loaded from the database. Click a name for the full record."
      />
      <div className="mt-6">
        <Input
          label="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, email, phone, or room"
        />
      </div>

      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No boarders in the database yet.{' '}
          <Link to="/admin/registrations" className="underline decoration-gold underline-offset-4">
            Review applications
          </Link>{' '}
          or{' '}
          <Link to="/admin/tenants" className="underline decoration-gold underline-offset-4">
            assign a bed
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((tenant) => {
            const status = paymentLabel(tenant.id)
            return (
              <button
                key={tenant.id}
                type="button"
                onClick={() => setOpen(tenant)}
                className="rounded-2xl border border-line bg-white p-5 text-left shadow-[0_18px_40px_-32px_rgba(10,10,10,0.4)] transition hover:border-gold"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl">{tenant.full_name}</p>
                    <p className="mt-1 text-sm text-muted">
                      Room {tenant.rooms?.room_number ?? '—'}
                      {tenant.rooms?.floors?.name ? ` · ${tenant.rooms.floors.name}` : ''}
                    </p>
                  </div>
                  <Badge tone={status === 'Paid up' ? 'success' : status === 'Overdue' ? 'full' : 'limited'}>
                    {status}
                  </Badge>
                </div>
                <p className="mt-4 text-sm text-muted">{tenant.email || tenant.phone || 'No contact on file'}</p>
              </button>
            )
          })}
        </div>
      )}

      <Modal open={Boolean(selected)} title={selected?.full_name ?? 'Boarder'} onClose={() => setOpen(null)} wide>
        {selected ? (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Username" value={toDisplayUsername(selected.email)} />
              <Info label="Phone" value={selected.phone} />
              <Info label="Floor" value={selected.rooms?.floors?.name} />
              <Info label="Room" value={selected.rooms?.room_number} />
              <Info label="Bed" value={selectedBed?.bed_code} />
              <Info label="Started" value={formatDate(selected.started_on)} />
              <Info label="Occupancy" value={selectedProfile?.occupancy_type} />
              <Info label="School / company" value={selectedProfile?.school_or_company} />
              <Info label="Nationality" value={selectedProfile?.nationality} />
              <Info label="Home address" value={selectedProfile?.home_address} />
              <Info
                label="Emergency"
                value={
                  [selectedProfile?.emergency_name, selectedProfile?.emergency_relationship, selectedProfile?.emergency_phone]
                    .filter(Boolean)
                    .join(' · ') || null
                }
              />
              <Info label="Notes" value={selected.notes} />
            </div>
            <div>
              <p className="text-xs tracking-[0.16em] text-gold uppercase">Bills</p>
              {selectedBills.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No bills yet. Assign a bed and set rent per bed.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-xl border border-line">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-paper-2 text-xs tracking-[0.12em] text-muted uppercase">
                      <tr>
                        <th className="px-4 py-2">Bill</th>
                        <th className="px-4 py-2">Due</th>
                        <th className="px-4 py-2">Total</th>
                        <th className="px-4 py-2">Paid</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBills.map((bill) => (
                        <tr key={bill.id} className="border-t border-line">
                          <td className="px-4 py-2 font-medium">
                            {bill.bill_number}
                            {bill.electricity_centavos > 0 || bill.water_centavos > 0 ? (
                              <span className="mt-1 block text-xs font-normal text-muted">
                                {bill.electricity_centavos > 0 ? `Electric ${formatPeso(bill.electricity_centavos)}` : ''}
                                {bill.electricity_centavos > 0 && bill.water_centavos > 0 ? ' · ' : ''}
                                {bill.water_centavos > 0 ? `Water ${formatPeso(bill.water_centavos)}` : ''}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 text-muted">{formatDate(bill.due_on)}</td>
                          <td className="px-4 py-2">{formatPeso(bill.total_centavos)}</td>
                          <td className="px-4 py-2">{formatPeso(bill.paid_centavos)}</td>
                          <td className="px-4 py-2">{bill.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/admin/tenants?room=${selected.room_id}`}
                className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm"
              >
                Edit assignment
              </Link>
              <Link
                to="/admin/messages"
                className="inline-flex min-h-11 items-center rounded-md bg-ink px-4 text-sm text-white"
              >
                Open messages
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="mt-1 text-sm">{value || '—'}</p>
    </div>
  )
}
