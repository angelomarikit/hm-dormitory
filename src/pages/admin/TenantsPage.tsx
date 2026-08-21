import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { roomTypeLabel } from '@/data/standardRooms'
import { useModalDraft } from '@/hooks/useSessionDraft'
import { toUserMessage } from '@/lib/errors'
import { fetchAllFloors } from '@/services/floorService'
import { ensureStandardLayout } from '@/services/layoutService'
import { fetchAllRooms } from '@/services/roomService'
import {
  createTenant,
  deleteTenant,
  fetchAllTenants,
  markTenantLeft,
  updateTenant,
} from '@/services/tenantService'
import { formatDate, todayISO } from '@/utils/format'
import { getAvailableSpaces, getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'
import type { Floor, RoomWithRelations, TenantInput, TenantWithRoom } from '@/types/database'

type StatusFilter = 'active' | 'left' | 'all'
type FloorFilter = 'all' | number

const emptyForm: TenantInput = {
  full_name: '',
  phone: '',
  notes: '',
  room_id: '',
  started_on: todayISO(),
}

export default function TenantsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('all')
  const { open, setOpen, editingId, setEditingId, form, setForm, resetDraft } = useModalDraft(
    siteId ? `tenants:${siteId}` : null,
    emptyForm,
  )
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ full_name?: string; room_id?: string; started_on?: string }>({})
  const [leaving, setLeaving] = useState<TenantWithRoom | null>(null)
  const [leftOn, setLeftOn] = useState(todayISO())
  const [pendingDelete, setPendingDelete] = useState<TenantWithRoom | null>(null)

  async function load() {
    if (!siteId) return
    setLoading(true)
    try {
      await ensureStandardLayout(siteId)
      const [nextFloors, nextRooms, nextTenants] = await Promise.all([
        fetchAllFloors(siteId),
        fetchAllRooms(siteId),
        fetchAllTenants(siteId),
      ])
      setFloors(nextFloors.filter((floor) => floor.is_active))
      setRooms(nextRooms.filter((room) => room.is_active))
      setTenants(nextTenants)
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to load tenants.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  useEffect(() => {
    const roomId = searchParams.get('room')
    if (!roomId || !rooms.some((room) => room.id === roomId)) return
    setForm((current) => ({ ...current, room_id: roomId, started_on: current.started_on || todayISO() }))
    setEditingId(null)
    setOpen(true)
    setSearchParams({}, { replace: true })
  }, [rooms, searchParams, setEditingId, setForm, setOpen, setSearchParams])

  const filteredTenants = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tenants.filter((tenant) => {
      if (statusFilter === 'active' && !tenant.is_active) return false
      if (statusFilter === 'left' && tenant.is_active) return false
      const floorNumber = tenant.rooms?.floors?.floor_number
      if (floorFilter !== 'all' && floorNumber !== floorFilter) return false
      if (!needle) return true
      const haystack = `${tenant.full_name} ${tenant.phone ?? ''} ${tenant.rooms?.room_number ?? ''}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [floorFilter, query, statusFilter, tenants])

  const grouped = useMemo(() => {
    const visibleFloors =
      floorFilter === 'all' ? floors : floors.filter((floor) => floor.floor_number === floorFilter)

    return visibleFloors.map((floor) => {
      const floorRooms = rooms
        .filter((room) => room.floor_id === floor.id)
        .sort((a, b) => a.sort_order - b.sort_order || a.room_number.localeCompare(b.room_number))

      return {
        floor,
        rooms: floorRooms
          .map((room) => ({
            room,
            tenants: filteredTenants.filter((tenant) => tenant.room_id === room.id),
          }))
          .filter((entry) => statusFilter === 'active' || entry.tenants.length > 0),
      }
    })
  }, [filteredTenants, floorFilter, floors, rooms, statusFilter])

  function openCreate(roomId?: string) {
    setEditingId(null)
    setErrors({})
    setForm({
      ...emptyForm,
      started_on: todayISO(),
      room_id: roomId ?? '',
    })
    setOpen(true)
  }

  function openEdit(tenant: TenantWithRoom) {
    setEditingId(tenant.id)
    setErrors({})
    setForm({
      full_name: tenant.full_name,
      phone: tenant.phone ?? '',
      notes: tenant.notes ?? '',
      room_id: tenant.room_id,
      started_on: tenant.started_on,
    })
    setOpen(true)
  }

  function validate() {
    const next: typeof errors = {}
    if (!form.full_name.trim()) next.full_name = 'Name is required.'
    if (!form.room_id) next.room_id = 'Choose a room.'
    if (!form.started_on) next.started_on = 'Start date is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function save() {
    if (!siteId || !validate()) return
    setSaving(true)
    try {
      if (editingId) {
        await updateTenant(siteId, editingId, form)
        toast.success('Tenant updated.')
      } else {
        await createTenant(siteId, form)
        toast.success('Tenant added.')
      }
      resetDraft()
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save tenant.'))
    } finally {
      setSaving(false)
    }
  }

  const editingTenant = tenants.find((tenant) => tenant.id === editingId) ?? null

  return (
    <div>
      <AdminPageHeader
        title="Tenants"
        description="Assign boarders to a room. Occupancy on Rooms and the website updates from who is currently staying."
        action={
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Add tenant
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, phone, or room"
            className="min-h-11 w-full rounded-md border border-line bg-white py-2 pr-3 pl-10 text-base outline-none focus:border-gold"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(['active', 'left', 'all'] as const).map((value) => (
            <Button
              key={value}
              variant={statusFilter === value ? 'primary' : 'outline'}
              onClick={() => setStatusFilter(value)}
            >
              {value === 'active' ? 'Staying' : value === 'left' ? 'Left' : 'All'}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant={floorFilter === 'all' ? 'secondary' : 'outline'} onClick={() => setFloorFilter('all')}>
          All floors
        </Button>
        {floors.map((floor) => (
          <Button
            key={floor.id}
            variant={floorFilter === floor.floor_number ? 'secondary' : 'outline'}
            onClick={() => setFloorFilter(floor.floor_number)}
          >
            {floor.name}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : grouped.every((group) => group.rooms.length === 0) ? (
        <div className="mt-6">
          <EmptyState
            title={statusFilter === 'left' ? 'No former boarders yet.' : 'No tenants on this floor yet.'}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {grouped.map(({ floor, rooms: floorRooms }) => (
            <section key={floor.id}>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">{floor.name}</h2>
                  <p className="mt-1 text-sm text-muted">{floor.description}</p>
                </div>
                <p className="text-sm text-muted">
                  {floorRooms.reduce((sum, entry) => sum + entry.tenants.filter((tenant) => tenant.is_active).length, 0)}{' '}
                  staying
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-line bg-white">
                {floorRooms.map(({ room, tenants: roomTenants }, index) => {
                  const available = getAvailableSpaces(room.capacity, room.occupied_spaces)
                  const status = getRoomStatus(available)
                  return (
                    <div key={room.id} className={index > 0 ? 'border-t border-line' : ''}>
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-paper-2 px-4 py-3">
                        <div>
                          <p className="font-medium">Room {room.room_number}</p>
                          <p className="text-sm text-muted">{roomTypeLabel(room.room_type, room.capacity)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
                          <span className="text-sm text-muted">
                            {room.occupied_spaces}/{room.capacity} occupied
                          </span>
                          {statusFilter !== 'left' ? (
                            <Button
                              variant="outline"
                              disabled={available <= 0}
                              onClick={() => openCreate(room.id)}
                            >
                              Assign
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {roomTenants.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-muted">No boarders assigned to this room.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead className="text-xs tracking-[0.12em] text-muted uppercase">
                              <tr>
                                <th className="px-4 py-2 font-medium">Name</th>
                                <th className="px-4 py-2 font-medium">Started</th>
                                <th className="px-4 py-2 font-medium">Status</th>
                                <th className="px-4 py-2 font-medium">Phone</th>
                                <th className="px-4 py-2 text-right font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {roomTenants.map((tenant) => (
                                <tr key={tenant.id} className="border-t border-line/70">
                                  <td className="px-4 py-3 font-medium">{tenant.full_name}</td>
                                  <td className="px-4 py-3">{formatDate(tenant.started_on)}</td>
                                  <td className="px-4 py-3">
                                    {tenant.is_active ? (
                                      <Badge tone="success">Staying</Badge>
                                    ) : (
                                      <span className="text-muted">Left {formatDate(tenant.left_on)}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-muted">{tenant.phone || '—'}</td>
                                  <td className="px-4 py-3">
                                    <div className="flex justify-end gap-2">
                                      {tenant.is_active ? (
                                        <>
                                          <Button variant="ghost" onClick={() => openEdit(tenant)}>
                                            Edit
                                          </Button>
                                          <Button
                                            variant="outline"
                                            onClick={() => {
                                              setLeaving(tenant)
                                              setLeftOn(todayISO())
                                            }}
                                          >
                                            Leaving
                                          </Button>
                                        </>
                                      ) : (
                                        <Button variant="ghost" onClick={() => setPendingDelete(tenant)}>
                                          Remove
                                        </Button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-muted">
        Room photos and website copy stay on the{' '}
        <Link to="/admin/rooms" className="text-ink underline decoration-gold underline-offset-4">
          Rooms
        </Link>{' '}
        page. Occupancy there follows these assignments.
      </p>

      <Modal
        open={open}
        title={editingId ? 'Edit tenant' : 'Add tenant'}
        onClose={() => setOpen(false)}
      >
        <div className="grid gap-4">
          <Input
            label="Full name"
            value={form.full_name}
            error={errors.full_name}
            onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
          />
          <Select
            label="Room"
            value={form.room_id}
            error={errors.room_id}
            onChange={(event) => setForm((current) => ({ ...current, room_id: event.target.value }))}
          >
            <option value="">Select a room</option>
            {floors.map((floor) => (
              <optgroup key={floor.id} label={floor.name}>
                {rooms
                  .filter((room) => room.floor_id === floor.id)
                  .map((room) => {
                    const available = getAvailableSpaces(room.capacity, room.occupied_spaces)
                    const isCurrent = editingTenant?.room_id === room.id
                    const canAssign = available > 0 || isCurrent
                    return (
                      <option key={room.id} value={room.id} disabled={!canAssign}>
                        {room.room_number} · {floor.name} · {isCurrent ? 'current' : `${available} open`}
                      </option>
                    )
                  })}
              </optgroup>
            ))}
          </Select>
          <Input
            label="Date started boarding"
            type="date"
            value={form.started_on}
            error={errors.started_on}
            onChange={(event) => setForm((current) => ({ ...current, started_on: event.target.value }))}
          />
          <Input
            label="Phone (optional)"
            value={form.phone ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <Textarea
            label="Notes (optional)"
            value={form.notes ?? ''}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
          <Button className="w-full" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save tenant'}
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(leaving)} title="Mark as leaving" onClose={() => setLeaving(null)}>
        <p className="text-sm text-muted">
          {leaving ? `${leaving.full_name} will free a bed in Room ${leaving.rooms?.room_number ?? ''}.` : ''}
        </p>
        <div className="mt-4 grid gap-4">
          <Input
            label="Last day"
            type="date"
            value={leftOn}
            min={leaving?.started_on}
            onChange={(event) => setLeftOn(event.target.value)}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setLeaving(null)}>
              Cancel
            </Button>
            <Button
              disabled={saving}
              onClick={async () => {
                if (!siteId || !leaving) return
                setSaving(true)
                try {
                  await markTenantLeft(siteId, leaving.id, leftOn)
                  toast.success('Tenant marked as left.')
                  setLeaving(null)
                  await load()
                } catch (error) {
                  toast.error(toUserMessage(error, 'Unable to update this tenant.'))
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? 'Saving…' : 'Confirm leaving'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove record"
        message={`Remove ${pendingDelete?.full_name ?? 'this tenant'} from the list? This does not change occupancy.`}
        loading={saving}
        confirmLabel="Remove"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!siteId || !pendingDelete) return
          setSaving(true)
          try {
            await deleteTenant(siteId, pendingDelete.id)
            toast.success('Record removed.')
            setPendingDelete(null)
            await load()
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to remove this record.'))
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}
