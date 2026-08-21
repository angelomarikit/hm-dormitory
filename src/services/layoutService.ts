import { supabase } from '@/lib/supabase'
import { STANDARD_FLOORS, STANDARD_ROOM_NUMBERS, STANDARD_ROOMS } from '@/data/standardRooms'
import { createFloor, fetchAllFloors, updateFloor } from '@/services/floorService'
import { fetchAllRooms } from '@/services/roomService'

export async function ensureStandardLayout(siteId: string): Promise<void> {
  const floors = await fetchAllFloors(siteId)
  const floorByNumber = new Map(floors.map((floor) => [floor.floor_number, floor]))

  for (const spec of STANDARD_FLOORS) {
    const existing = floorByNumber.get(spec.floorNumber)
    if (!existing) {
      const created = await createFloor(siteId, {
        name: spec.name,
        floor_number: spec.floorNumber,
        description: spec.description,
        sort_order: spec.sortOrder,
        is_active: true,
      })
      floorByNumber.set(spec.floorNumber, created)
      continue
    }

    const needsUpdate =
      existing.name !== spec.name ||
      existing.description !== spec.description ||
      existing.sort_order !== spec.sortOrder ||
      !existing.is_active

    if (needsUpdate) {
      const updated = await updateFloor(siteId, existing.id, {
        name: spec.name,
        floor_number: spec.floorNumber,
        description: spec.description,
        sort_order: spec.sortOrder,
        is_active: true,
      })
      floorByNumber.set(spec.floorNumber, updated)
    }
  }

  const rooms = await fetchAllRooms(siteId)
  const roomByNumber = new Map(rooms.map((room) => [room.room_number, room]))

  const alreadySynced = STANDARD_ROOMS.every((spec) => {
    const room = roomByNumber.get(spec.roomNumber)
    const floor = floorByNumber.get(spec.floorNumber)
    return Boolean(
      room &&
        floor &&
        room.is_active &&
        room.floor_id === floor.id &&
        room.capacity === spec.capacity &&
        room.room_name === spec.roomName,
    )
  })

  if (alreadySynced && rooms.every((room) => !room.is_active || STANDARD_ROOM_NUMBERS.has(room.room_number))) {
    return
  }

  const toInsert = STANDARD_ROOMS.filter((spec) => !roomByNumber.has(spec.roomNumber)).map((spec) => {
    const floor = floorByNumber.get(spec.floorNumber)
    if (!floor) {
      throw new Error('Unable to set up the standard rooms.')
    }
    return {
      site_id: siteId,
      floor_id: floor.id,
      room_number: spec.roomNumber,
      room_name: spec.roomName,
      capacity: spec.capacity,
      occupied_spaces: 0,
      sort_order: spec.sortOrder,
      is_active: true,
    }
  })

  if (toInsert.length > 0) {
    const { error } = await supabase.from('rooms').insert(toInsert)
    if (error) {
      console.error('Failed to create standard rooms', error.message)
      throw new Error(mapLayoutError(error.message))
    }
  }

  for (const spec of STANDARD_ROOMS) {
    const floor = floorByNumber.get(spec.floorNumber)
    const existing = roomByNumber.get(spec.roomNumber)
    if (!floor || !existing) continue

    const needsUpdate =
      existing.floor_id !== floor.id ||
      existing.capacity !== spec.capacity ||
      existing.room_name !== spec.roomName ||
      existing.sort_order !== spec.sortOrder ||
      !existing.is_active

    if (!needsUpdate) continue

    const { error } = await supabase
      .from('rooms')
      .update({
        floor_id: floor.id,
        room_name: spec.roomName,
        capacity: spec.capacity,
        sort_order: spec.sortOrder,
        is_active: true,
        occupied_spaces: Math.min(existing.occupied_spaces, spec.capacity),
      })
      .eq('id', existing.id)
      .eq('site_id', siteId)

    if (error) {
      console.error('Failed to update standard room', error.message)
      throw new Error(mapLayoutError(error.message))
    }
  }

  const extras = rooms.filter((room) => room.is_active && !STANDARD_ROOM_NUMBERS.has(room.room_number))
  for (const extra of extras) {
    const { error } = await supabase
      .from('rooms')
      .update({ is_active: false })
      .eq('id', extra.id)
      .eq('site_id', siteId)

    if (error) {
      console.error('Failed to hide extra room', error.message)
    }
  }
}

function mapLayoutError(message: string | undefined) {
  if (message && /schema cache|does not exist|permission/i.test(message)) {
    return 'Unable to set up the standard rooms. Check that you are signed in as a site admin.'
  }
  return 'Unable to set up the standard rooms.'
}
