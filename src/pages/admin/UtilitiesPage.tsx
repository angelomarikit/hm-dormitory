import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Trash2, Zap } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { groupRoomsByStandardFloor, roomTypeLabel } from '@/data/standardRooms'
import { toUserMessage } from '@/lib/errors'
import { fetchAllFloors } from '@/services/floorService'
import { fetchAllRooms } from '@/services/roomService'
import { fetchActiveTenants } from '@/services/tenantService'
import {
  deleteUtilityCharge,
  fetchPreviousRoomReadings,
  fetchUtilityCharges,
  generateMonthUtilities,
  monthStartISO,
  periodKey,
  readingLabel,
  saveRoomUtilities,
  splitUtilityShares,
  utilityMonthOptions,
} from '@/services/utilityService'
import { signedUrl } from '@/services/privateStorage'
import { logActivity } from '@/services/commsService'
import { formatDateTime } from '@/utils/format'
import { formatPeso, parsePesoInput } from '@/utils/money'
import type { RoomWithRelations, TenantWithRoom } from '@/types/database'
import type { UtilityCharge } from '@/types/ops'

const MONTHS = utilityMonthOptions()

export default function UtilitiesPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [month, setMonth] = useState(monthStartISO())
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [floors, setFloors] = useState<Array<{ id: string; floor_number: number; name: string; description: string | null }>>([])
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [charges, setCharges] = useState<UtilityCharge[]>([])
  const [open, setOpen] = useState<RoomWithRelations | null>(null)
  const [electric, setElectric] = useState('')
  const [electricPrevious, setElectricPrevious] = useState('')
  const [electricCurrent, setElectricCurrent] = useState('')
  const [water, setWater] = useState('')
  const [waterPrevious, setWaterPrevious] = useState('')
  const [waterCurrent, setWaterCurrent] = useState('')
  const [notes, setNotes] = useState('')
  const [billFile, setBillFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})

  async function load(quiet = false) {
    if (!siteId) return
    if (!quiet) setLoading(true)
    try {
      const [nextFloors, nextRooms, nextTenants, nextCharges] = await Promise.all([
        fetchAllFloors(siteId),
        fetchAllRooms(siteId),
        fetchActiveTenants(siteId),
        fetchUtilityCharges(siteId, month),
      ])
      setFloors(nextFloors.filter((floor) => floor.is_active))
      setRooms(nextRooms.filter((room) => room.is_active))
      setTenants(nextTenants)
      setCharges(nextCharges)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to load rooms.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, month])

  const grouped = useMemo(() => groupRoomsByStandardFloor(floors, rooms), [floors, rooms])
  const pendingCount = charges.filter((item) => !item.applied_at).length
  const monthLabel = MONTHS.find((item) => item.value === month)?.label ?? month

  function occupants(roomId: string) {
    return tenants.filter((tenant) => tenant.room_id === roomId)
  }

  function roomCharge(roomId: string) {
    return charges.find((item) => item.room_id === roomId && periodKey(item.period_start) === month) ?? null
  }

  const selectedOccupants = open ? occupants(open.id) : []
  const selectedCharge = open ? roomCharge(open.id) : null
  const electricCents = parsePesoInput(electric)
  const waterCents = parsePesoInput(water)
  const electricShares = splitUtilityShares(electricCents, selectedOccupants.length)
  const waterShares = splitUtilityShares(waterCents, selectedOccupants.length)

  function resetForm() {
    setElectric('')
    setElectricPrevious('')
    setElectricCurrent('')
    setWater('')
    setWaterPrevious('')
    setWaterCurrent('')
    setNotes('')
    setBillFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  function openRoom(room: RoomWithRelations) {
    const charge = roomCharge(room.id)
    setOpen(room)
    setElectric(charge ? String(charge.electricity_centavos / 100) : '')
    setElectricPrevious(readingLabel(charge?.electricity_previous_reading))
    setElectricCurrent(readingLabel(charge?.electricity_current_reading))
    setWater(charge ? String(charge.water_centavos / 100) : '')
    setWaterPrevious(readingLabel(charge?.water_previous_reading))
    setWaterCurrent(readingLabel(charge?.water_current_reading))
    setNotes(charge?.notes ?? '')
    setBillFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    if (!siteId) return
    if (charge?.electricity_previous_reading != null || charge?.water_previous_reading != null) return
    void fetchPreviousRoomReadings(siteId, room.id, month)
      .then((previous) => {
        if (previous.electricity != null && !charge?.electricity_previous_reading) {
          setElectricPrevious(readingLabel(previous.electricity))
        }
        if (previous.water != null && !charge?.water_previous_reading) {
          setWaterPrevious(readingLabel(previous.water))
        }
      })
      .catch(() => undefined)
  }

  async function save() {
    if (!siteId || !open) return
    if (selectedOccupants.length === 0) {
      toast.error('This room has no boarders to split the bill with.')
      return
    }
    setSaving(true)
    try {
      await saveRoomUtilities(siteId, open.id, month, {
        electricityPesos: electric,
        waterPesos: water,
        notes,
        billFile,
        electricityPrevious: electricPrevious,
        electricityCurrent: electricCurrent,
        waterPrevious: waterPrevious,
        waterCurrent: waterCurrent,
      })
      toast.success('Saved. Click Generate to add this to each boarder’s bill.')
      setOpen(null)
      resetForm()
      await load(true)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save electric and water.'))
    } finally {
      setSaving(false)
    }
  }

  async function generate() {
    if (!siteId) return
    setGenerating(true)
    try {
      const result = await generateMonthUtilities(siteId, month)
      await logActivity(siteId, 'utilities_generated', 'billing', month, `${result.rooms} rooms`)
      toast.success(
        `Added electric and water for ${result.rooms} room${result.rooms === 1 ? '' : 's'} to boarder bills.`,
      )
      await load(true)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to generate billing.'))
    } finally {
      setGenerating(false)
    }
  }

  async function removeCharge(charge: UtilityCharge, event?: MouseEvent) {
    event?.stopPropagation()
    if (!siteId) return
    const ok = window.confirm(
      charge.applied_at
        ? 'Remove this electric and water charge from the boarders’ bills?'
        : 'Delete this saved electric and water entry?',
    )
    if (!ok) return
    setDeletingId(charge.id)
    try {
      await deleteUtilityCharge(charge.id)
      await logActivity(siteId, 'utilities_deleted', 'room', charge.room_id, month)
      toast.success('Charge deleted.')
      if (open?.id === charge.room_id) {
        setOpen(null)
        resetForm()
      }
      await load(true)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to delete this charge.'))
    } finally {
      setDeletingId(null)
    }
  }

  async function openBillImage(path: string) {
    if (imageUrls[path]) {
      window.open(imageUrls[path], '_blank', 'noopener,noreferrer')
      return
    }
    try {
      const url = await signedUrl('payment-receipts', path)
      setImageUrls((current) => ({ ...current, [path]: url }))
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to open the bill photo.'))
    }
  }

  function personLines(roomId: string, charge: UtilityCharge | null) {
    const people = occupants(roomId)
    if (people.length === 0) return []
    if (charge?.applied_at && charge.utility_charge_shares?.length) {
      return people.map((tenant) => {
        const share = charge.utility_charge_shares?.find((item) => item.tenant_id === tenant.id)
        return {
          id: tenant.id,
          name: tenant.full_name,
          electric: share?.electricity_centavos ?? 0,
          water: share?.water_centavos ?? 0,
        }
      })
    }
    if (!charge) return []
    const elec = splitUtilityShares(charge.electricity_centavos, people.length)
    const wat = splitUtilityShares(charge.water_centavos, people.length)
    return people.map((tenant, index) => ({
      id: tenant.id,
      name: tenant.full_name,
      electric: elec[index] ?? 0,
      water: wat[index] ?? 0,
    }))
  }

  return (
    <div>
      <AdminPageHeader
        title="Electric & water"
        description="Pick a month, enter each room’s meter totals, then click Generate. Each boarder in the room gets an equal share on their bill, titled Electric and Water."
      />

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
        <div className="w-full max-w-xs">
          <Select label="Month" value={month} onChange={(event) => setMonth(event.target.value)}>
            {MONTHS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <Button disabled={generating || pendingCount === 0} onClick={() => void generate()}>
          <Zap className="h-4 w-4" />
          {generating ? 'Generating…' : `Generate${pendingCount ? ` (${pendingCount})` : ''}`}
        </Button>
        <p className="text-sm text-muted">
          {pendingCount
            ? `${pendingCount} room${pendingCount === 1 ? '' : 's'} ready for ${monthLabel}.`
            : `Enter a room’s meters, then Generate to add ${monthLabel} to boarder billing.`}
        </p>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.map(({ spec, rooms: floorRooms }) => (
            <section key={spec.floorNumber}>
              <h2 className="font-display text-2xl">{spec.name}</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {floorRooms.map(({ spec: roomSpec, room }) => {
                  if (!room) return null
                  const people = occupants(room.id)
                  const charge = roomCharge(room.id)
                  const lines = personLines(room.id, charge)
                  return (
                    <article key={room.id} className="flex flex-col rounded-xl border border-line bg-white p-5">
                      <button type="button" className="text-left" onClick={() => openRoom(room)}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">Room {roomSpec.roomNumber}</h3>
                            <p className="text-sm text-muted">{roomTypeLabel(roomSpec.roomType, roomSpec.capacity)}</p>
                          </div>
                          <Badge
                            tone={
                              charge?.applied_at ? 'success' : charge ? 'limited' : people.length ? 'neutral' : 'neutral'
                            }
                          >
                            {charge?.applied_at ? 'On bills' : charge ? 'Ready' : people.length ? `${people.length} boarders` : 'Empty'}
                          </Badge>
                        </div>
                      </button>
                      {lines.length > 0 ? (
                        <ul className="mt-3 space-y-1.5 text-sm">
                          {lines.map((line) => (
                            <li key={line.id} className="border-t border-line/70 pt-1.5">
                              <span className="font-medium">{line.name}</span>
                              <span className="mt-0.5 block text-xs text-muted">
                                Electric {formatPeso(line.electric)} · Water {formatPeso(line.water)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-sm text-muted">
                          {people.length === 0 ? 'No boarders assigned yet.' : 'Click to add electric and water.'}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => openRoom(room)}>
                          {charge?.applied_at ? 'View' : charge ? 'Edit' : 'Add meters'}
                        </Button>
                        {charge ? (
                          <Button
                            variant="danger"
                            disabled={deletingId === charge.id}
                            onClick={(event) => void removeCharge(charge, event)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingId === charge.id ? 'Deleting…' : 'Delete'}
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(open)}
        title={open ? `Room ${open.room_number} · ${monthLabel}` : 'Electric & water'}
        wide
        onClose={() => {
          setOpen(null)
          resetForm()
        }}
      >
        {open ? (
          <div className="grid gap-4">
            {selectedCharge?.applied_at ? (
              <p className="rounded-xl border border-line bg-paper-2 p-4 text-sm">
                This month is already on the boarders’ bills. Delete it first if you need to correct the amounts.
              </p>
            ) : null}
            <div className="rounded-xl border border-line bg-paper-2 p-4 text-sm">
              <p className="text-xs tracking-[0.16em] text-gold uppercase">Per person</p>
              {selectedOccupants.length === 0 ? (
                <p className="mt-2 text-muted">Assign boarders to this room first.</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {selectedOccupants.map((tenant, index) => (
                    <li key={tenant.id} className="flex justify-between gap-3">
                      <span>{tenant.full_name}</span>
                      <span className="text-muted">
                        Electric {formatPeso(electricShares[index] ?? 0)} · Water {formatPeso(waterShares[index] ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Input
              label="Electric (PHP)"
              inputMode="decimal"
              value={electric}
              disabled={Boolean(selectedCharge?.applied_at)}
              onChange={(event) => setElectric(event.target.value)}
              placeholder="1000"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Previous electric reading"
                inputMode="decimal"
                value={electricPrevious}
                disabled={Boolean(selectedCharge?.applied_at)}
                onChange={(event) => setElectricPrevious(event.target.value)}
                placeholder="0"
              />
              <Input
                label="Existing electric reading"
                inputMode="decimal"
                value={electricCurrent}
                disabled={Boolean(selectedCharge?.applied_at)}
                onChange={(event) => setElectricCurrent(event.target.value)}
                placeholder="0"
              />
            </div>
            <Input
              label="Water (PHP)"
              inputMode="decimal"
              value={water}
              disabled={Boolean(selectedCharge?.applied_at)}
              onChange={(event) => setWater(event.target.value)}
              placeholder="300"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Previous water reading"
                inputMode="decimal"
                value={waterPrevious}
                disabled={Boolean(selectedCharge?.applied_at)}
                onChange={(event) => setWaterPrevious(event.target.value)}
                placeholder="0"
              />
              <Input
                label="Existing water reading"
                inputMode="decimal"
                value={waterCurrent}
                disabled={Boolean(selectedCharge?.applied_at)}
                onChange={(event) => setWaterCurrent(event.target.value)}
                placeholder="0"
              />
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="block font-medium">Bill photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="block w-full text-sm"
                disabled={Boolean(selectedCharge?.applied_at)}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setBillFile(file)
                  if (preview) URL.revokeObjectURL(preview)
                  setPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
                  event.target.value = ''
                }}
              />
              {preview ? (
                <img src={preview} alt="Utility bill" className="mt-2 max-h-40 rounded-xl border border-line object-contain" />
              ) : null}
            </label>
            <Textarea
              label="Notes (optional)"
              value={notes}
              disabled={Boolean(selectedCharge?.applied_at)}
              onChange={(event) => setNotes(event.target.value)}
            />
            {selectedCharge?.applied_at ? (
              <Button variant="danger" disabled={deletingId === selectedCharge.id} onClick={() => void removeCharge(selectedCharge)}>
                <Trash2 className="h-4 w-4" />
                {deletingId === selectedCharge.id ? 'Deleting…' : 'Delete from boarder bills'}
              </Button>
            ) : (
              <Button disabled={saving || selectedOccupants.length === 0} onClick={() => void save()}>
                {saving ? 'Saving…' : 'Save for this month'}
              </Button>
            )}
            {selectedCharge?.bill_image_path ? (
              <button
                type="button"
                className="text-sm underline decoration-gold underline-offset-4"
                onClick={() => void openBillImage(selectedCharge.bill_image_path as string)}
              >
                View uploaded bill · {formatDateTime(selectedCharge.created_at)}
              </button>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
