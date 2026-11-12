import { useEffect, useState } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { fetchBeds } from '@/services/bedService'
import { fetchAllRooms } from '@/services/roomService'
import { fetchActiveTenants } from '@/services/tenantService'
import { approveRegistration, fetchRegistrations, setRegistrationStatus } from '@/services/registrationService'
import { logActivity } from '@/services/commsService'
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
  const [occupiedBeds, setOccupiedBeds] = useState<string[]>([])
  const [open, setOpen] = useState<Registration | null>(null)
  const [roomId, setRoomId] = useState('')
  const [bedId, setBedId] = useState('')
  const [note, setNote] = useState('')

  async function load() {
    if (!siteId) return
    const [regs, nextRooms, nextBeds, tenants] = await Promise.all([
      fetchRegistrations(siteId),
      fetchAllRooms(siteId),
      fetchBeds(siteId),
      fetchActiveTenants(siteId),
    ])
    setItems(regs)
    setRooms(nextRooms.filter((room) => room.is_active))
    setBeds(nextBeds)
    setOccupiedBeds(tenants.map((t) => t.bed_id).filter(Boolean) as string[])
  }

  useEffect(() => {
    void load().catch((error) => toast.error(toUserMessage(error, 'Unable to load registrations.')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  const openBeds = beds.filter((bed) => bed.room_id === roomId && !occupiedBeds.includes(bed.id))

  return (
    <div>
      <AdminPageHeader title="Registrations" description="Review applications from the website registration form. Approval assigns a room and bed." />
      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs tracking-[0.12em] text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
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
                <td className="px-4 py-3 text-muted">{item.email}</td>
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

      <Modal open={Boolean(open)} title={open?.full_name ?? 'Application'} onClose={() => setOpen(null)}>
        {open ? (
          <div className="grid gap-3 text-sm">
            <p>{open.email} · {open.mobile}</p>
            <p>{open.home_address}</p>
            <p>
              {open.occupancy_type} {open.school_or_company ? `· ${open.school_or_company}` : ''}
            </p>
            <Select label="Assign room" value={roomId} onChange={(e) => { setRoomId(e.target.value); setBedId(''); }}>
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_number}
                </option>
              ))}
            </Select>
            <Select label="Assign bed" value={bedId} onChange={(e) => setBedId(e.target.value)}>
              <option value="">Select bed</option>
              {openBeds.map((bed) => (
                <option key={bed.id} value={bed.id}>
                  {bed.bed_code}
                  {(bed.monthly_rent_centavos ?? 0) > 0 ? ` · ${formatPeso(bed.monthly_rent_centavos ?? 0)}` : ''}
                </option>
              ))}
            </Select>
            <Textarea label="Notes" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={async () => {
                  if (!siteId || !roomId || !bedId) return
                  const bed = beds.find((item) => item.id === bedId)
                  const room = rooms.find((item) => item.id === roomId)
                  try {
                    await approveRegistration({
                      siteId,
                      registration: open,
                      roomId,
                      bedId,
                      rentCentavos:
                        bed?.monthly_rent_centavos ||
                        (room as { monthly_rent_centavos?: number } | undefined)?.monthly_rent_centavos ||
                        0,
                    })
                    await logActivity(siteId, 'registration_approved', 'registration', open.id, open.reference_number)
                    toast.success('Application approved.')
                    setOpen(null)
                    await load()
                  } catch (error) {
                    toast.error(toUserMessage(error, 'Unable to approve.'))
                  }
                }}
              >
                Approve and assign
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
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
