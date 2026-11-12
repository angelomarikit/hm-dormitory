import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { groupRoomsByStandardFloor, roomTypeLabel } from '@/data/standardRooms'
import { toUserMessage } from '@/lib/errors'
import { fetchAllFloors } from '@/services/floorService'
import { ensureStandardLayout } from '@/services/layoutService'
import {
  addRoomImage,
  deleteRoomImage,
  fetchAllRooms,
  updateRoomDetails,
} from '@/services/roomService'
import { fetchBeds } from '@/services/bedService'
import { updateRoomRent } from '@/services/billingService'
import { fetchActiveTenants } from '@/services/tenantService'
import { deleteSiteAssetByUrl, uploadSiteAsset } from '@/services/storageService'
import { getAvailableSpaces, getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'
import { centavosToPesos, formatPeso, parsePesoInput } from '@/utils/money'
import type { RoomWithRelations, TenantWithRoom } from '@/types/database'
import type { Bed } from '@/types/ops'

export default function RoomsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [floors, setFloors] = useState<Array<{ id: string; floor_number: number; name: string; description: string | null }>>([])
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [tenants, setTenants] = useState<TenantWithRoom[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [editingRoom, setEditingRoom] = useState<RoomWithRelations | null>(null)
  const [description, setDescription] = useState('')
  const [rentPesos, setRentPesos] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function load() {
    if (!siteId) return
    setLoading(true)
    try {
      await ensureStandardLayout(siteId)
      const [nextFloors, nextRooms] = await Promise.all([
        fetchAllFloors(siteId),
        fetchAllRooms(siteId),
      ])
      setFloors(nextFloors.filter((floor) => floor.is_active))
      setRooms(nextRooms.filter((room) => room.is_active))
      try {
        setTenants(await fetchActiveTenants(siteId))
      } catch {
        setTenants([])
      }
      try {
        setBeds(await fetchBeds(siteId))
      } catch {
        setBeds([])
      }
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to load rooms.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  const grouped = useMemo(() => groupRoomsByStandardFloor(floors, rooms), [floors, rooms])

  function tenantsForRoom(roomId: string) {
    return tenants.filter((tenant) => tenant.room_id === roomId)
  }

  async function saveDescription() {
    if (!siteId || !editingRoom) return
    setSaving(true)
    try {
      await updateRoomDetails(siteId, editingRoom.id, {
        description,
        room_name: editingRoom.room_name,
      })
      if (rentPesos.trim()) {
        await updateRoomRent(siteId, editingRoom.id, parsePesoInput(rentPesos))
      }
      toast.success('Room details saved.')
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save room.'))
    } finally {
      setSaving(false)
    }
  }

  async function uploadPhoto(file: File) {
    if (!siteId || !editingRoom) return
    setUploading(true)
    try {
      const url = await uploadSiteAsset(siteId, `rooms/${editingRoom.id}`, file)
      await addRoomImage(
        siteId,
        editingRoom.id,
        url,
        `Room ${editingRoom.room_number}`,
        editingRoom.room_images.length,
      )
      toast.success('Photo uploaded.')
      const refreshed = (await fetchAllRooms(siteId)).find((item) => item.id === editingRoom.id)
      if (refreshed) {
        setEditingRoom(refreshed)
        setRooms((current) => current.map((item) => (item.id === refreshed.id ? refreshed : item)))
      }
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to upload photo.'))
    } finally {
      setUploading(false)
    }
  }

  async function removePhoto(imageId: string, imageUrl: string) {
    if (!siteId) return
    try {
      await deleteRoomImage(siteId, imageId)
      await deleteSiteAssetByUrl(imageUrl)
      toast.success('Photo removed.')
      if (editingRoom) {
        setEditingRoom({
          ...editingRoom,
          room_images: editingRoom.room_images.filter((image) => image.id !== imageId),
        })
      }
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to remove photo.'))
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Rooms & beds"
        description="Each room can hold many beds (usually 10). Set rent per bed. A boarder is billed only after they are assigned to a specific bed."
        action={
          <Link
            to="/admin/tenants"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium tracking-wide text-white"
          >
            Assign tenants
          </Link>
        }
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.map(({ spec, floor, rooms: floorRooms }) => {
            const occupied = floorRooms.reduce((sum, entry) => sum + (entry.room?.occupied_spaces ?? 0), 0)
            const capacity = floorRooms.reduce((sum, entry) => sum + entry.spec.capacity, 0)
            return (
              <section key={spec.floorNumber}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl">{spec.name}</h2>
                    <p className="mt-1 text-sm text-muted">{spec.description}</p>
                  </div>
                  <p className="text-sm text-muted">
                    {occupied}/{capacity} occupied · {floorRooms.length} rooms
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {floorRooms.map(({ spec: roomSpec, room }) => {
                    const occupiedSpaces = room?.occupied_spaces ?? 0
                    const available = getAvailableSpaces(roomSpec.capacity, occupiedSpaces)
                    const status = getRoomStatus(available)
                    const assigned = room ? tenantsForRoom(room.id) : []
                    const roomBeds = room ? beds.filter((bed) => bed.room_id === room.id) : []
                    const billedCount = assigned.filter((tenant) => tenant.bed_id).length
                    const rentCentavos =
                      roomBeds.find((bed) => (bed.monthly_rent_centavos ?? 0) > 0)?.monthly_rent_centavos ??
                      room?.monthly_rent_centavos ??
                      0
                    return (
                      <article key={roomSpec.roomNumber} className="rounded-xl border border-line bg-white p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">Room {roomSpec.roomNumber}</h3>
                            <p className="text-sm text-muted">
                              {roomTypeLabel(roomSpec.roomType, roomSpec.capacity)}
                            </p>
                          </div>
                          <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper-2">
                          <div
                            className="h-full bg-gold"
                            style={{
                              width: `${roomSpec.capacity > 0 ? (occupiedSpaces / roomSpec.capacity) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-sm">
                          {occupiedSpaces} occupied · {available} available
                        </p>
                        {rentCentavos ? (
                          <p className="mt-1 text-sm text-muted">{formatPeso(rentCentavos)} per occupied bed</p>
                        ) : null}
                        {room ? (
                          <p className="mt-2 text-xs text-muted">
                            {roomBeds.length
                              ? `${billedCount} of ${roomBeds.length} beds billed`
                              : 'Run ops SQL to seed beds.'}
                          </p>
                        ) : null}
                        <div className="mt-4">
                          {assigned.length === 0 ? (
                            <p className="text-sm text-muted">No boarders assigned yet.</p>
                          ) : (
                            <ul className="space-y-1 text-sm">
                              {assigned.map((tenant) => (
                                <li key={tenant.id}>
                                  {tenant.full_name}
                                  {tenant.bed_id
                                    ? ` · ${beds.find((bed) => bed.id === tenant.bed_id)?.bed_code ?? ''}`
                                    : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {room ? (
                            <>
                              <Link
                                to={`/admin/tenants?room=${room.id}`}
                                className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm"
                              >
                                Assign
                              </Link>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingRoom(room)
                                  setDescription(room.description ?? '')
                                  const bedRent = beds.find(
                                    (bed) => bed.room_id === room.id && (bed.monthly_rent_centavos ?? 0) > 0,
                                  )?.monthly_rent_centavos
                                  const cents = room.monthly_rent_centavos || bedRent || 0
                                  setRentPesos(cents ? String(centavosToPesos(cents)) : '')
                                }}
                              >
                                Photos & notes
                              </Button>
                            </>
                          ) : (
                            <p className="text-sm text-muted">
                              {floor ? 'This room is being added.' : 'Sign in as admin to save this layout.'}
                            </p>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <Modal
        open={Boolean(editingRoom)}
        title={editingRoom ? `Room ${editingRoom.room_number}` : 'Room'}
        onClose={() => setEditingRoom(null)}
      >
        {editingRoom ? (
          <div className="grid gap-4">
            <p className="text-sm text-muted">
              {roomTypeLabel(editingRoom.room_type, editingRoom.capacity)}. Each bed is billed separately.
              Only a boarder assigned to a bed gets an invoice. Empty beds are not billed.
            </p>
            <Input
              label="Rent per bed (PHP)"
              value={rentPesos}
              onChange={(event) => setRentPesos(event.target.value)}
            />
            <p className="text-xs text-muted">
              This amount is saved on every bed in this room. Example: 10 occupied beds × ₱3,500 = 10
              separate bills.
            </p>
            <ul className="space-y-1 text-sm">
              {beds
                .filter((bed) => bed.room_id === editingRoom.id)
                .map((bed) => {
                  const occupant = tenants.find((tenant) => tenant.bed_id === bed.id)
                  return (
                    <li key={bed.id} className="flex justify-between gap-3 text-muted">
                      <span>{bed.bed_code}</span>
                      <span>{occupant ? `${occupant.full_name} · billed` : 'Open · not billed'}</span>
                    </li>
                  )
                })}
            </ul>
            <Textarea
              label="Description shown on the website"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <ImageUpload
              label="Add room photo"
              uploading={uploading}
              onSelect={(file) => void uploadPhoto(file)}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {editingRoom.room_images.map((image) => (
                <div key={image.id} className="relative">
                  <img src={image.image_url} alt="" className="h-24 w-full rounded-xl object-cover" />
                  <button
                    type="button"
                    className="absolute top-2 right-2 rounded-full bg-white/90 p-1"
                    aria-label="Remove photo"
                    onClick={() => void removePhoto(image.id, image.image_url)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void saveDescription()}>
              {saving ? 'Saving…' : 'Save notes'}
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
