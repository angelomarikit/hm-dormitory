import { supabase } from '@/lib/supabase'
import { throwIfError } from '@/lib/errors'
import { getAvailableSpaces, getRoomStatus } from '@/utils/roomAvailability'
import type {
  AvailabilitySummary,
  Floor,
  Room,
  RoomImage,
  RoomInput,
  RoomWithRelations,
} from '@/types/database'

const ROOM_SELECT = `
  *,
  floors ( id, name, floor_number ),
  room_images ( id, site_id, room_id, image_url, alt_text, sort_order, created_at )
`

export async function fetchPublicRooms(siteId: string): Promise<RoomWithRelations[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select(ROOM_SELECT)
    .eq('site_id', siteId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('room_number', { ascending: true })

  const rooms = throwIfError(data as RoomWithRelations[] | null, error, 'Unable to load rooms.')
  return rooms.map(sortRoomImages)
}

export async function fetchAllRooms(siteId: string): Promise<RoomWithRelations[]> {
  const { data, error } = await supabase
    .from('rooms')
    .select(ROOM_SELECT)
    .eq('site_id', siteId)
    .order('sort_order', { ascending: true })
    .order('room_number', { ascending: true })

  const rooms = throwIfError(data as RoomWithRelations[] | null, error, 'Unable to load rooms.')
  return rooms.map(sortRoomImages)
}

export async function createRoom(siteId: string, input: RoomInput): Promise<Room> {
  validateRoomInput(input)

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      site_id: siteId,
      floor_id: input.floor_id,
      room_number: input.room_number.trim(),
      room_name: input.room_name?.trim() || null,
      description: input.description?.trim() || null,
      capacity: input.capacity,
      occupied_spaces: input.occupied_spaces,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single()

  return throwIfError(data as Room | null, error, 'Unable to add room.')
}

export async function updateRoom(
  siteId: string,
  id: string,
  input: RoomInput,
): Promise<Room> {
  validateRoomInput(input)

  const { data, error } = await supabase
    .from('rooms')
    .update({
      floor_id: input.floor_id,
      room_number: input.room_number.trim(),
      room_name: input.room_name?.trim() || null,
      description: input.description?.trim() || null,
      capacity: input.capacity,
      occupied_spaces: input.occupied_spaces,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Room | null, error, 'Unable to update room.')
}

export async function updateRoomOccupancy(
  siteId: string,
  id: string,
  occupiedSpaces: number,
  capacity: number,
): Promise<Room> {
  if (occupiedSpaces < 0 || occupiedSpaces > capacity) {
    throw new Error('Occupied spaces cannot be negative or greater than capacity.')
  }

  const { data, error } = await supabase
    .from('rooms')
    .update({ occupied_spaces: occupiedSpaces })
    .eq('id', id)
    .eq('site_id', siteId)
    .select('*')
    .single()

  return throwIfError(data as Room | null, error, 'Unable to update occupancy.')
}

export async function updateRoomSortOrder(
  siteId: string,
  id: string,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ sort_order: sortOrder })
    .eq('id', id)
    .eq('site_id', siteId)

  if (error) {
    console.error('Failed to reorder room', error.message)
    throw new Error('Unable to update room order.')
  }
}

export async function deleteRoom(siteId: string, id: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', id).eq('site_id', siteId)
  if (error) {
    console.error('Failed to delete room', error.message)
    throw new Error('Unable to remove this room.')
  }
}

export async function addRoomImage(
  siteId: string,
  roomId: string,
  imageUrl: string,
  altText: string | null,
  sortOrder: number,
): Promise<RoomImage> {
  const { data, error } = await supabase
    .from('room_images')
    .insert({
      site_id: siteId,
      room_id: roomId,
      image_url: imageUrl,
      alt_text: altText,
      sort_order: sortOrder,
    })
    .select('*')
    .single()

  return throwIfError(data as RoomImage | null, error, 'Unable to save room photo.')
}

export async function deleteRoomImage(siteId: string, id: string): Promise<void> {
  const { error } = await supabase.from('room_images').delete().eq('id', id).eq('site_id', siteId)
  if (error) {
    console.error('Failed to delete room image', error.message)
    throw new Error('Unable to remove this photo.')
  }
}

export function buildAvailabilitySummary(
  rooms: RoomWithRelations[],
  floors: Floor[],
): AvailabilitySummary {
  const activeRooms = rooms.filter((room) => room.is_active)
  const lastUpdated = activeRooms.reduce<string | null>((latest, room) => {
    if (!latest || room.updated_at > latest) return room.updated_at
    return latest
  }, null)

  const floorSummaries = floors
    .filter((floor) => floor.is_active)
    .map((floor) => {
      const floorRooms = activeRooms.filter((room) => room.floor_id === floor.id)
      const capacity = floorRooms.reduce((sum, room) => sum + room.capacity, 0)
      const occupiedSpaces = floorRooms.reduce((sum, room) => sum + room.occupied_spaces, 0)
      return {
        floorId: floor.id,
        name: floor.name,
        floorNumber: floor.floor_number,
        roomCount: floorRooms.length,
        capacity,
        occupiedSpaces,
        availableSpaces: getAvailableSpaces(capacity, occupiedSpaces),
      }
    })

  const totalCapacity = activeRooms.reduce((sum, room) => sum + room.capacity, 0)
  const occupiedSpaces = activeRooms.reduce((sum, room) => sum + room.occupied_spaces, 0)

  return {
    totalRooms: activeRooms.length,
    totalCapacity,
    occupiedSpaces,
    availableSpaces: getAvailableSpaces(totalCapacity, occupiedSpaces),
    availableRooms: activeRooms.filter(
      (room) => getRoomStatus(getAvailableSpaces(room.capacity, room.occupied_spaces)) === 'available',
    ).length,
    limitedRooms: activeRooms.filter(
      (room) => getRoomStatus(getAvailableSpaces(room.capacity, room.occupied_spaces)) === 'limited',
    ).length,
    fullRooms: activeRooms.filter(
      (room) => getRoomStatus(getAvailableSpaces(room.capacity, room.occupied_spaces)) === 'full',
    ).length,
    lastUpdated,
    floors: floorSummaries,
  }
}

function sortRoomImages(room: RoomWithRelations): RoomWithRelations {
  return {
    ...room,
    room_images: [...(room.room_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }
}

function validateRoomInput(input: RoomInput) {
  if (!input.room_number.trim()) {
    throw new Error('Room number is required.')
  }
  if (input.capacity < 0 || input.occupied_spaces < 0) {
    throw new Error('Capacity and occupied spaces cannot be negative.')
  }
  if (input.occupied_spaces > input.capacity) {
    throw new Error('Occupied spaces cannot exceed capacity.')
  }
}
