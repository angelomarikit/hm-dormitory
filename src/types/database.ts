export type SiteRole = 'owner' | 'admin' | 'editor'

export interface Site {
  id: string
  name: string
  slug: string
  logo_url: string | null
  hero_image_url: string | null
  building_image_url: string | null
  short_description: string | null
  hero_heading: string | null
  hero_subheading: string | null
  address: string | null
  phone: string | null
  email: string | null
  facebook_url: string | null
  messenger_url: string | null
  registration_url: string | null
  google_maps_embed_url: string | null
  google_maps_directions_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SiteUpdate = Partial<
  Pick<
    Site,
    | 'name'
    | 'logo_url'
    | 'hero_image_url'
    | 'building_image_url'
    | 'short_description'
    | 'hero_heading'
    | 'hero_subheading'
    | 'address'
    | 'phone'
    | 'email'
    | 'facebook_url'
    | 'messenger_url'
    | 'registration_url'
    | 'google_maps_embed_url'
    | 'google_maps_directions_url'
  >
>

export interface SiteMember {
  id: string
  site_id: string
  user_id: string
  role: SiteRole
  created_at: string
}

export interface Announcement {
  id: string
  site_id: string
  title: string
  content: string
  is_important: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export type AnnouncementInput = {
  title: string
  content: string
  is_important: boolean
  is_published: boolean
}

export interface Floor {
  id: string
  site_id: string
  name: string
  floor_number: number
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FloorInput = {
  name: string
  floor_number: number
  description?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface Room {
  id: string
  site_id: string
  floor_id: string
  room_number: string
  room_name: string | null
  description: string | null
  capacity: number
  occupied_spaces: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoomImage {
  id: string
  site_id: string
  room_id: string
  image_url: string
  alt_text: string | null
  sort_order: number
  created_at: string
}

export interface RoomWithRelations extends Room {
  floors: Pick<Floor, 'id' | 'name' | 'floor_number'> | null
  room_images: RoomImage[]
}

export type RoomInput = {
  floor_id: string
  room_number: string
  room_name?: string | null
  description?: string | null
  capacity: number
  occupied_spaces: number
  sort_order?: number
  is_active?: boolean
}

export interface Amenity {
  id: string
  site_id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AmenityInput = {
  name: string
  description?: string | null
  image_url?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface Rate {
  id: string
  site_id: string
  monthly_rate: string | null
  monthly_rate_label: string | null
  electricity_information: string | null
  water_information: string | null
  other_fees: string | null
  deposit_information: string | null
  additional_notes: string | null
  updated_at: string
}

export type RateUpdate = Partial<
  Pick<
    Rate,
    | 'monthly_rate'
    | 'monthly_rate_label'
    | 'electricity_information'
    | 'water_information'
    | 'other_fees'
    | 'deposit_information'
    | 'additional_notes'
  >
>

export interface Faq {
  id: string
  site_id: string
  question: string
  answer: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type FaqInput = {
  question: string
  answer: string
  sort_order?: number
  is_active?: boolean
}

export interface HouseRule {
  id: string
  site_id: string
  title: string | null
  description: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type HouseRuleInput = {
  title?: string | null
  description: string
  sort_order?: number
  is_active?: boolean
}

export interface FloorAvailability {
  floorId: string
  name: string
  floorNumber: number
  roomCount: number
  capacity: number
  occupiedSpaces: number
  availableSpaces: number
}

export interface AvailabilitySummary {
  totalRooms: number
  totalCapacity: number
  occupiedSpaces: number
  availableSpaces: number
  availableRooms: number
  limitedRooms: number
  fullRooms: number
  lastUpdated: string | null
  floors: FloorAvailability[]
}
