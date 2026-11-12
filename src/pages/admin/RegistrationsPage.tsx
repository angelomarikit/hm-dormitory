import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchBeds } from '@/services/bedService'
import { fetchAllRooms } from '@/services/roomService'
import { approveRegistration, fetchRegistrations, setRegistrationStatus } from '@/services/registrationService'
import { logActivity } from '@/services/commsService'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/utils/format'
import { formatPeso } from '@/utils/money'
import { toUserMessage } from '@/lib/errors'
import type { Registration } from '@/types/ops'
import type { Bed } from '@/types/ops'
import type { RoomWithRelations } from '@/types/database'

export default function RegistrationsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [items, setItems] = useState<Registration[]>([])
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [open, setOpen] = useState<Registration | null>(null)
  const [note, setNote] = useState('')

  async function load() {
    if (!siteId) return
    const [regs, nextRooms, nextBeds] = await Promise.all([
      fetchRegistrations(siteId),
      fetchAllRooms(siteId),
      fetchBeds(siteId),
    ])
    setItems(regs)
    setRooms(nextRooms.filter((room) => room.is_active))
    setBeds(nextBeds)
  }

  useEffect(() => {
    void load().catch((error) => toast.error(toUserMessage(error, 'Unable to load registrations.')))
    if (!siteId) return
    const channel = supabase
      .channel(`registrations:${siteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'registrations', filter: `site_id=eq.${siteId}` },
        () => {
          void load().catch(() => undefined)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  function roomNumber(registration: Registration) {
    return rooms.find((room) => room.id === registration.preferred_room_id)?.room_number ?? '—'
  }

  function bedCode(registration: Registration) {
    return beds.find((bed) => bed.id === registration.preferred_bed_id)?.bed_code ?? '—'
  }

  return (
    <div>
      <AdminPageHeader
        title="Registrations"
        description="Room and bed come from the applicant’s form. Approve to confirm that allocation."
      />
      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No applications in the database yet"
            description="When someone submits the website registration form, it is stored here — not in the browser. Refresh or wait; new rows appear for every admin."
          />
        </div>
      ) : (
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs tracking-[0.12em] text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Bed</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-line/70">
                <td className="px-4 py-3 font-medium">{item.reference_number}</td>
                <td className="px-4 py-3">{item.full_name}</td>
                <td className="px-4 py-3">{roomNumber(item)}</td>
                <td className="px-4 py-3">{bedCode(item)}</td>
                <td className="px-4 py-3 text-muted">{formatDateTime(item.created_at)}</td>
                <td className="px-4 py-3">
                  <Badge tone={item.status === 'approved' ? 'success' : 'neutral'}>{item.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" onClick={() => { setOpen(item); setNote(''); }}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      <Modal open={Boolean(open)} title={open?.full_name ?? 'Application'} onClose={() => setOpen(null)}>
        {open ? (
          <div className="grid gap-3 text-sm">
            <p>Username {open.email} · {open.mobile}</p>
            <p>{open.home_address}</p>
            <p>
              {open.occupancy_type} {open.school_or_company ? `· ${open.school_or_company}` : ''}
              {open.expected_stay ? ` · ${open.expected_stay}` : ''}
            </p>
            <div className="rounded-xl border border-line bg-paper-2 p-4">
              <p className="text-xs tracking-[0.16em] text-gold uppercase">Chosen allocation</p>
              <p className="mt-2 font-display text-2xl">
                Room {roomNumber(open)} · {bedCode(open)}
              </p>
              {(() => {
                const bed = beds.find((item) => item.id === open.preferred_bed_id)
                const rent = bed?.monthly_rent_centavos ?? 0
                return rent ? <p className="mt-1 text-sm text-muted">{formatPeso(rent)} per month</p> : null
              })()}
            </div>
            <Textarea label="Notes" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!open.preferred_room_id || !open.preferred_bed_id}
                onClick={async () => {
                  if (!siteId || !open.preferred_room_id || !open.preferred_bed_id) return
                  const bed = beds.find((item) => item.id === open.preferred_bed_id)
                  const room = rooms.find((item) => item.id === open.preferred_room_id)
                  try {
                    await approveRegistration({
                      siteId,
                      registration: open,
                      roomId: open.preferred_room_id,
                      bedId: open.preferred_bed_id,
                      rentCentavos:
                        bed?.monthly_rent_centavos ||
                        room?.monthly_rent_centavos ||
                        0,
                    })
                    await logActivity(siteId, 'registration_approved', 'registration', open.id, open.reference_number)
                    toast.success('Application approved with the chosen room and bed.')
                    setOpen(null)
                    await load()
                  } catch (error) {
                    toast.error(toUserMessage(error, 'Unable to approve.'))
                  }
                }}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (!siteId) return
                  await setRegistrationStatus(siteId, open.id, 'rejected', note || 'Rejected')
                  toast.success('Application rejected.')
                  setOpen(null)
                  await load()
                }}
              >
                Reject
              </Button>
            </div>
            {!open.preferred_room_id || !open.preferred_bed_id ? (
              <p className="text-sm text-muted">
                This older application has no room and bed on file. Ask the applicant to submit again after running
                014_registration_bed.sql.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
