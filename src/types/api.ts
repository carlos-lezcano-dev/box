export type Role = 'ATHLETE' | 'COACH' | 'ADMIN'
export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CREDIT_CARD'

export interface Meta {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface SuccessEnvelope<T> {
  success: true
  data: T
  meta?: Meta
  message?: string
  status?: string
}

export interface ApiErrorDetail {
  field: string
  rule: string
  message: string
}

export interface ErrorEnvelope {
  success: false
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[]
  }
  request_id: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginUser {
  user_id: string
  email: string
  full_name: string
  role: Role
}

export interface LoginResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  user: LoginUser
}

export interface CurrentUser {
  user_id: string
  email: string
  full_name: string
  phone: string | null
  emergency_contact: string | null
  role: Role
  is_active: boolean
  created_at: string
}

export type UserItem = CurrentUser

export interface Wod {
  wod_id: string
  coach_id: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string
  max_capacity: number
  confirmed_count: number
  available_slots: number
  waitlist_count: number
  created_at: string
}

export interface RosterEntry {
  booking_id: string
  user_id: string
  full_name: string
  booked_at: string
  promoted_at?: string | null
  position?: number
}

export interface WodRoster {
  wod_id: string
  max_capacity: number
  confirmed_count: number
  waitlist_count: number
  confirmed: RosterEntry[]
  waitlist: RosterEntry[]
}

export interface Membership {
  membership_id: string
  user_id: string
  plan_name: string
  amount_paid: number
  start_date: string
  end_date: string
  status: MembershipStatus
  payment_method: PaymentMethod
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface BookingWod {
  wod_id?: string
  title: string
  description?: string | null
  coach_id?: string | null
  coach_full_name?: string | null
  start_time: string
  end_time: string
  max_capacity?: number
  available_slots?: number
}

export interface Booking {
  booking_id: string
  wod_id: string
  user_id: string
  status: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED' | 'NOSHOW'
  booked_at: string
  confirmed_at: string | null
  promoted_at: string | null
  cancelled_at: string | null
  cancel_reason?: string | null
  waitlist_position: number | null
  wod: BookingWod
}

export interface CreateBookingResult {
  booking_id: string
  status: 'CONFIRMED' | 'WAITLIST'
  available_slots?: number
  waitlist_position?: number
}

export interface CancelWodResult {
  wod_id: string
  cancelled_bookings: number
}

export interface CancelBookingResult {
  booking_id: string
  status: 'CANCELLED'
  cancelled_at: string
  promoted: boolean
  promoted_user_id: string | null
}

export interface ActionResult<T = unknown> {
  ok: boolean
  code?: string
  message?: string
  requestId?: string
  fields?: Record<string, string>
  data?: T
  retryAfter?: string
}
