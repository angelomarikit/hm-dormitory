import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { OccupancyControl } from '@/components/admin/OccupancyControl'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { toUserMessage } from '@/lib/errors'
import {
  createFloor,
  deleteFloor,
  fetchAllFloors,
  updateFloor,
} from '@/services/floorService'
import {
  addRoomImage,
  createRoom,
  deleteRoom,
  deleteRoomImage,
  fetchAllRooms,
  updateRoom,
  updateRoomOccupancy,
  updateRoomSortOrder,
} from '@/services/roomService'
import { deleteSiteAssetByUrl, uploadSiteAsset } from '@/services/storageService'
import { getAvailableSpaces, getRoomStatus, getRoomStatusLabel } from '@/utils/roomAvailability'
import type { Floor, FloorInput, RoomInput, RoomWithRelations } from '@/types/database'

const emptyRoom: RoomInput = {
  floor_id: '',
  room_number: '',
  room_name: '',
  description: '',
  capacity: 1,
  occupied_spaces: 0,
  sort_order: 0,
  is_active: true,
}

const emptyFloor: FloorInput = {
  name: '',
  floor_number: 1,
  description: '',
  sort_order: 1,
  is_active: true,
}

export default function RoomsPage() {
  const { siteId } = useSite()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [floors, setFloors] = useState<Floor[]>([])
  const [rooms, setRooms] = useState<RoomWithRelations[]>([])
  const [roomForm, setRoomForm] = useState<RoomInput>(emptyRoom)
  const [floorForm, setFloorForm] = useState<FloorInput>(emptyFloor)
  const [editingRoom, setEditingRoom] = useState<RoomWithRelations | null>(null)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)
  const [roomOpen, setRoomOpen] = useState(false)
  const [floorOpen, setFloorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingRoom, setPendingRoom] = useState<RoomWithRelations | null>(null)
  const [pendingFloor, setPendingFloor] = useState<Floor | null>(null)
  const [roomErrors, setRoomErrors] = useState<Record<string, string>>({})

  async function load() {
    if (!siteId) return
    setLoading(true)
    try {
      const [nextFloors, nextRooms] = await Promise.all([
        fetchAllFloors(siteId),
        fetchAllRooms(siteId),
      ])
      setFloors(nextFloors)
      setRooms(nextRooms)
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

  const grouped = useMemo(
    () =>
      floors.map((floor) => ({
        floor,
        rooms: rooms.filter((room) => room.floor_id === floor.id),
      })),
    [floors, rooms],
  )

  function openCreateRoom(floorId?: string) {
    setEditingRoom(null)
    setRoomForm({
      ...emptyRoom,
      floor_id: floorId || floors[0]?.id || '',
    })
    setRoomErrors({})
    setRoomOpen(true)
  }

  function openEditRoom(room: RoomWithRelations) {
    setEditingRoom(room)
    setRoomForm({
      floor_id: room.floor_id,
      room_number: room.room_number,
      room_name: room.room_name ?? '',
      description: room.description ?? '',
      capacity: room.capacity,
      occupied_spaces: room.occupied_spaces,
      sort_order: room.sort_order,
      is_active: room.is_active,
    })
    setRoomErrors({})
    setRoomOpen(true)
  }

  async function saveRoom() {
    if (!siteId) return
    const errors: Record<string, string> = {}
    if (!roomForm.room_number.trim()) errors.room_number = 'Room number is required.'
    if (!roomForm.floor_id) errors.floor_id = 'Choose a floor.'
    if (roomForm.capacity < 0) errors.capacity = 'Capacity cannot be negative.'
    if (roomForm.occupied_spaces < 0) errors.occupied_spaces = 'Occupied spaces cannot be negative.'
    if (roomForm.occupied_spaces > roomForm.capacity) {
      errors.occupied_spaces = 'Occupied spaces cannot exceed capacity.'
    }
    setRoomErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    try {
      if (editingRoom) {
        await updateRoom(siteId, editingRoom.id, roomForm)
        toast.success('Room updated.')
      } else {
        await createRoom(siteId, roomForm)
        toast.success('Room added.')
      }
      setRoomOpen(false)
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save room.'))
    } finally {
      setSaving(false)
    }
  }

  async function changeOccupancy(room: RoomWithRelations, nextOccupied: number) {
    if (!siteId) return
    const previous = rooms
    setRooms((current) =>
      current.map((item) =>
        item.id === room.id ? { ...item, occupied_spaces: nextOccupied } : item,
      ),
    )
    try {
      await updateRoomOccupancy(siteId, room.id, nextOccupied, room.capacity)
    } catch (error) {
      setRooms(previous)
      toast.error(toUserMessage(error, 'Unable to update occupancy.'))
    }
  }

  async function moveRoom(room: RoomWithRelations, direction: -1 | 1) {
    if (!siteId) return
    const siblings = rooms
      .filter((item) => item.floor_id === room.floor_id)
      .sort((a, b) => a.sort_order - b.sort_order || a.room_number.localeCompare(b.room_number))
    const index = siblings.findIndex((item) => item.id === room.id)
    const swapWith = siblings[index + direction]
    if (!swapWith) return
    try {
      await Promise.all([
        updateRoomSortOrder(siteId, room.id, swapWith.sort_order),
        updateRoomSortOrder(siteId, swapWith.id, room.sort_order),
      ])
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to change room order.'))
    }
  }

  async function saveFloor() {
    if (!siteId) return
    if (!floorForm.name.trim()) {
      toast.error('Floor name is required.')
      return
    }
    setSaving(true)
    try {
      if (editingFloor) {
        await updateFloor(siteId, editingFloor.id, floorForm)
        toast.success('Floor updated.')
      } else {
        await createFloor(siteId, floorForm)
        toast.success('Floor added.')
      }
      setFloorOpen(false)
      await load()
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save floor.'))
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
      await load()
      const refreshed = (await fetchAllRooms(siteId)).find((item) => item.id === editingRoom.id)
      if (refreshed) setEditingRoom(refreshed)
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
      await load()
      if (editingRoom) {
        setEditingRoom((current) =>
          current
            ? { ...current, room_images: current.room_images.filter((image) => image.id !== imageId) }
            : current,
        )
      }
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to remove photo.'))
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Rooms"
        description="Update occupancy from your phone in a few taps."
        action={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingFloor(null)
              setFloorForm({
                ...emptyFloor,
                floor_number: (floors.at(-1)?.floor_number ?? 0) + 1,
                sort_order: floors.length + 1,
              })
              setFloorOpen(true)
            }}
          >
            Manage floors
          </Button>
          <Button onClick={() => openCreateRoom()}>
            <Plus className="h-4 w-4" />
            Add room
          </Button>
        </div>
        }
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Add a floor before creating rooms." />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {grouped.map(({ floor, rooms: floorRooms }) => (
            <section key={floor.id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">{floor.name}</h2>
                  {!floor.is_active ? <Badge tone="neutral">Hidden</Badge> : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditingFloor(floor)
                      setFloorForm({
                        name: floor.name,
                        floor_number: floor.floor_number,
                        description: floor.description,
                        sort_order: floor.sort_order,
                        is_active: floor.is_active,
                      })
                      setFloorOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Floor
                  </Button>
                  <Button variant="outline" onClick={() => openCreateRoom(floor.id)}>
                    Add room
                  </Button>
                </div>
              </div>
              {floorRooms.length === 0 ? (
                <EmptyState title="No rooms on this floor yet." />
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {floorRooms.map((room) => {
                    const available = getAvailableSpaces(room.capacity, room.occupied_spaces)
                    const status = getRoomStatus(available)
                    return (
                      <article key={room.id} className="rounded-xl border border-line bg-white p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold">Room {room.room_number}</h3>
                            <p className="text-sm text-muted">{room.room_name || floor.name}</p>
                          </div>
                          <Badge tone={status}>{getRoomStatusLabel(status)}</Badge>
                        </div>
                        <div className="mt-4">
                          <OccupancyControl
                            capacity={room.capacity}
                            occupied={room.occupied_spaces}
                            onChange={(value) => void changeOccupancy(room, value)}
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => openEditRoom(room)}>
                            Edit
                          </Button>
                          <Button variant="ghost" onClick={() => void moveRoom(room, -1)} aria-label="Move up">
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" onClick={() => void moveRoom(room, 1)} aria-label="Move down">
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" onClick={() => setPendingRoom(room)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <Modal open={roomOpen} title={editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add room'} onClose={() => setRoomOpen(false)} wide>
        <div className="grid gap-4">
          <Select
            label="Floor"
            value={roomForm.floor_id}
            error={roomErrors.floor_id}
            onChange={(event) => setRoomForm((current) => ({ ...current, floor_id: event.target.value }))}
          >
            <option value="">Select floor</option>
            {floors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.name}
              </option>
            ))}
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Room number"
              value={roomForm.room_number}
              error={roomErrors.room_number}
              onChange={(event) => setRoomForm((current) => ({ ...current, room_number: event.target.value }))}
            />
            <Input
              label="Room name (optional)"
              value={roomForm.room_name ?? ''}
              onChange={(event) => setRoomForm((current) => ({ ...current, room_name: event.target.value }))}
            />
          </div>
          <Textarea
            label="Description"
            value={roomForm.description ?? ''}
            onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Capacity"
              type="number"
              min={0}
              value={roomForm.capacity}
              error={roomErrors.capacity}
              onChange={(event) =>
                setRoomForm((current) => ({ ...current, capacity: Number(event.target.value) }))
              }
            />
            <Input
              label="Occupied spaces"
              type="number"
              min={0}
              value={roomForm.occupied_spaces}
              error={roomErrors.occupied_spaces}
              onChange={(event) =>
                setRoomForm((current) => ({ ...current, occupied_spaces: Number(event.target.value) }))
              }
            />
            <Input
              label="Display order"
              type="number"
              value={roomForm.sort_order ?? 0}
              onChange={(event) =>
                setRoomForm((current) => ({ ...current, sort_order: Number(event.target.value) }))
              }
            />
          </div>
          <Switch
            label="Show this room on the website"
            checked={roomForm.is_active ?? true}
            onChange={(checked) => setRoomForm((current) => ({ ...current, is_active: checked }))}
          />
          {editingRoom ? (
            <div className="space-y-3">
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
            </div>
          ) : (
            <p className="text-sm text-muted">Save the room first, then add photos.</p>
          )}
          <Button className="w-full" disabled={saving} onClick={() => void saveRoom()}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={floorOpen}
        title={editingFloor ? 'Edit floor' : 'Add floor'}
        onClose={() => setFloorOpen(false)}
      >
        <div className="space-y-4">
          <Input
            label="Floor name"
            value={floorForm.name}
            onChange={(event) => setFloorForm((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Floor number"
            type="number"
            value={floorForm.floor_number}
            onChange={(event) =>
              setFloorForm((current) => ({ ...current, floor_number: Number(event.target.value) }))
            }
          />
          <Textarea
            label="Description"
            value={floorForm.description ?? ''}
            onChange={(event) => setFloorForm((current) => ({ ...current, description: event.target.value }))}
          />
          <Switch
            label="Show this floor on the website"
            checked={floorForm.is_active ?? true}
            onChange={(checked) => setFloorForm((current) => ({ ...current, is_active: checked }))}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={saving} onClick={() => void saveFloor()}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            {editingFloor ? (
              <Button variant="danger" onClick={() => setPendingFloor(editingFloor)}>
                Remove floor
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingRoom)}
        title="Remove room"
        message={`Are you sure you want to remove Room ${pendingRoom?.room_number ?? ''}?`}
        loading={saving}
        onCancel={() => setPendingRoom(null)}
        onConfirm={async () => {
          if (!siteId || !pendingRoom) return
          setSaving(true)
          try {
            await deleteRoom(siteId, pendingRoom.id)
            toast.success('Room removed.')
            setPendingRoom(null)
            setRoomOpen(false)
            await load()
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to remove room.'))
          } finally {
            setSaving(false)
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingFloor)}
        title="Remove floor"
        message={`Are you sure you want to remove ${pendingFloor?.name ?? 'this floor'}? Rooms on this floor must be removed first.`}
        loading={saving}
        onCancel={() => setPendingFloor(null)}
        onConfirm={async () => {
          if (!siteId || !pendingFloor) return
          setSaving(true)
          try {
            await deleteFloor(siteId, pendingFloor.id)
            toast.success('Floor removed.')
            setPendingFloor(null)
            setFloorOpen(false)
            await load()
          } catch (error) {
            toast.error(toUserMessage(error, 'Unable to remove floor.'))
          } finally {
            setSaving(false)
          }
        }}
      />
    </div>
  )
}
