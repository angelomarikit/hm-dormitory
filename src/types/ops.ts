export type RegistrationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'cancelled'
export type BoarderStatus = 'pending' | 'active' | 'inactive' | 'rejected'
export type BillStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'voided'
export type PaymentMethod = 'gcash' | 'maya' | 'qrph' | 'cash'
export type PaymentStatus = 'pending_verification' | 'confirmed' | 'rejected' | 'reversed'
export type AccessKind = 'anonymous' | 'cms' | 'caretaker' | 'boarder' | 'pending_boarder' | 'unassigned'

export interface Bed {
  id: string
  site_id: string
  room_id: string
  bed_code: string
  sort_order: number
  is_active: boolean
  monthly_rent_centavos?: number
}

export interface BoarderProfile {
  id: string
  site_id: string
  tenant_id: string | null
  user_id: string | null
  status: BoarderStatus
  occupancy_type: string | null
  school_or_company: string | null
  date_of_birth: string | null
  gender: string | null
  nationality: string | null
  home_address: string | null
  emergency_name: string | null
  emergency_relationship: string | null
  emergency_phone: string | null
  monthly_rent_centavos: number | null
  created_at: string
  updated_at: string
}

export interface Registration {
  id: string
  site_id: string
  user_id: string | null
  reference_number: string
  status: RegistrationStatus
  full_name: string
  date_of_birth: string | null
  gender: string | null
  nationality: string | null
  home_address: string | null
  occupancy_type: string | null
  school_or_company: string | null
  email: string
  mobile: string
  emergency_name: string | null
  emergency_relationship: string | null
  emergency_phone: string | null
  preferred_room_type: string | null
  preferred_room_id: string | null
  preferred_bed_id?: string | null
  preferred_move_in: string | null
  expected_stay: string | null
  special_requests: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
}

export interface RegistrationInput {
  full_name: string
  date_of_birth: string
  gender: string
  nationality: string
  home_address: string
  occupancy_type: string
  school_or_company: string
  email: string
  mobile: string
  emergency_name: string
  emergency_relationship: string
  emergency_phone: string
  preferred_room_type: string
  preferred_room_id: string
  preferred_bed_id: string
  preferred_move_in: string
  expected_stay: string
  special_requests: string
  password: string
}

export interface Bill {
  id: string
  site_id: string
  tenant_id: string
  room_id: string | null
  bed_id?: string | null
  bill_number: string
  period_start: string
  period_end: string
  due_on: string
  rent_centavos: number
  electricity_centavos: number
  water_centavos: number
  other_centavos: number
  discount_centavos: number
  total_centavos: number
  paid_centavos: number
  status: BillStatus
  notes: string | null
  created_at: string
}

export interface UtilityChargeShare {
  id: string
  charge_id: string
  tenant_id: string
  bill_id: string | null
  electricity_centavos: number
  water_centavos: number
}

export interface UtilityCharge {
  id: string
  site_id: string
  room_id: string
  period_start: string
  electricity_centavos: number
  water_centavos: number
  occupant_count: number
  bill_image_path: string | null
  notes: string | null
  applied_at: string | null
  electricity_previous_reading?: number | null
  electricity_current_reading?: number | null
  water_previous_reading?: number | null
  water_current_reading?: number | null
  created_at: string
  utility_charge_shares?: UtilityChargeShare[]
}

export interface Payment {
  id: string
  site_id: string
  tenant_id: string
  bill_id: string
  amount_centavos: number
  method: PaymentMethod
  status: PaymentStatus
  reference_number: string | null
  paid_on: string
  notes: string | null
  rejection_reason: string | null
  created_at: string
}

export interface Notice {
  id: string
  site_id: string
  title: string
  body: string
  category: string
  priority: string
  audience: string
  room_id: string | null
  published_at: string | null
  expires_at: string | null
  created_at: string
}

export interface Conversation {
  id: string
  site_id: string
  tenant_id: string
  category: string
  status: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  site_id: string
  sender_id: string
  body: string
  created_at: string
}

export interface MaintenanceRequest {
  id: string
  site_id: string
  tenant_id: string
  room_id: string | null
  title: string
  details: string | null
  status: string
  created_at: string
}

export interface AppNotification {
  id: string
  site_id: string
  user_id: string | null
  title: string
  body: string | null
  link_path: string | null
  is_read: boolean
  created_at: string
}

export interface ActivityLog {
  id: string
  site_id: string
  actor_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  detail: string | null
  created_at: string
}
