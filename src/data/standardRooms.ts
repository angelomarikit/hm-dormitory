export type RoomSize = 'big' | 'small'

export interface StandardFloorSpec {
  floorNumber: number
  name: string
  description: string
  sortOrder: number
}

export interface StandardRoomSpec {
  floorNumber: number
  roomNumber: string
  roomName: string
  capacity: number
  roomType: RoomSize
  sortOrder: number
}

export const STANDARD_FLOORS: StandardFloorSpec[] = [
  {
    floorNumber: 1,
    name: 'Ground Floor',
    description: 'Ten rooms. Big rooms hold 10 boarders; small rooms hold 4.',
    sortOrder: 1,
  },
  {
    floorNumber: 2,
    name: 'Second Floor',
    description: 'Ten rooms. Big rooms hold 10 boarders; small rooms hold 4.',
    sortOrder: 2,
  },
  {
    floorNumber: 3,
    name: 'Third Floor',
    description: 'Eleven small rooms, each holding 4 boarders, plus a study area.',
    sortOrder: 3,
  },
]

function mixedFloorRooms(floorNumber: number): StandardRoomSpec[] {
  const prefix = String(floorNumber)
  const rooms: StandardRoomSpec[] = []

  for (let n = 1; n <= 10; n += 1) {
    const number = `${prefix}${String(n).padStart(2, '0')}`
    const isSmall = n === 5 || n === 6
    rooms.push({
      floorNumber,
      roomNumber: number,
      roomName: isSmall ? 'Small room' : 'Big room',
      capacity: isSmall ? 4 : 10,
      roomType: isSmall ? 'small' : 'big',
      sortOrder: Number(number),
    })
  }

  return rooms
}

function smallFloorRooms(floorNumber: number, count = 11): StandardRoomSpec[] {
  const prefix = String(floorNumber)
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1
    const number = `${prefix}${String(n).padStart(2, '0')}`
    return {
      floorNumber,
      roomNumber: number,
      roomName: 'Small room',
      capacity: 4,
      roomType: 'small' as const,
      sortOrder: Number(number),
    }
  })
}

export const STANDARD_ROOMS: StandardRoomSpec[] = [
  ...mixedFloorRooms(1),
  ...mixedFloorRooms(2),
  ...smallFloorRooms(3),
]

export const STANDARD_ROOM_NUMBERS = new Set(STANDARD_ROOMS.map((room) => room.roomNumber))

export function roomTypeLabel(roomType: string | null | undefined, capacity: number) {
  if (roomType === 'big' || capacity === 10) return 'Big room · 10 people'
  if (roomType === 'small' || capacity === 4) return 'Small room · 4 people'
  return `${capacity} people`
}

export function groupRoomsByStandardFloor<T extends { room_number: string; floor_id: string }>(
  floors: Array<{ id: string; floor_number: number; name: string; description: string | null }>,
  rooms: T[],
) {
  return STANDARD_FLOORS.map((spec) => {
    const floor = floors.find((item) => item.floor_number === spec.floorNumber) ?? null
    const floorRooms = STANDARD_ROOMS.filter((room) => room.floorNumber === spec.floorNumber).map((roomSpec) => ({
      spec: roomSpec,
      room: rooms.find((item) => item.room_number === roomSpec.roomNumber) ?? null,
    }))
    return { spec, floor, rooms: floorRooms }
  })
}
