export type RoomStatus = 'available' | 'limited' | 'full'

export const LIMITED_SPACE_THRESHOLD = 2

export function getAvailableSpaces(capacity: number, occupiedSpaces: number): number {
  return Math.max(0, capacity - occupiedSpaces)
}

export function getRoomStatus(
  availableSpaces: number,
  limitedThreshold = LIMITED_SPACE_THRESHOLD,
): RoomStatus {
  if (availableSpaces <= 0) return 'full'
  if (availableSpaces <= limitedThreshold) return 'limited'
  return 'available'
}

export function getRoomStatusLabel(status: RoomStatus): string {
  if (status === 'full') return 'Full'
  if (status === 'limited') return 'Limited Space'
  return 'Available'
}

export function clampOccupancy(occupiedSpaces: number, capacity: number): number {
  if (Number.isNaN(occupiedSpaces) || occupiedSpaces < 0) return 0
  if (occupiedSpaces > capacity) return capacity
  return occupiedSpaces
}
