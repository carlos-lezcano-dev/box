import { apiRequest } from '@/api/client'
import type {
  Booking,
  CancelBookingResult,
  CreateBookingResult,
  Wod,
} from '@/types/api'
import { getWodById } from '@/api/wods'

function normalizeList(value: unknown): Booking[] {
  if (Array.isArray(value)) return value as Booking[]
  if (value && typeof value === 'object') return [value as Booking]
  return []
}

/** El backend anida un `wod` parcial; se completa con `/wods/:id` una vez por render. */
async function hydrate(booking: Booking, token: string, cache: Map<string, Promise<Wod>>) {
  const nested = booking.wod
  if (nested?.coach_full_name || nested?.max_capacity !== undefined) return booking
  const id = nested?.wod_id ?? booking.wod_id
  if (!cache.has(id)) cache.set(id, getWodById(token, id))
  try {
    const full = await cache.get(id)!
    return { ...booking, wod: { ...nested, ...full } }
  } catch {
    return booking
  }
}

export async function getMyBookings(token: string): Promise<Booking[]> {
  const result = await apiRequest<Booking[] | Booking>('/bookings/me', { token })
  const cache = new Map<string, Promise<Wod>>()
  return Promise.all(normalizeList(result.data).map((item) => hydrate(item, token, cache)))
}

export async function createBooking(
  token: string,
  wodId: string,
  idempotencyKey: string,
): Promise<CreateBookingResult & { statusText?: string }> {
  const result = await apiRequest<CreateBookingResult>('/bookings', {
    method: 'POST',
    token,
    body: { wod_id: wodId },
    idempotencyKey,
  })
  return { ...result.data, statusText: result.status }
}

export async function cancelBooking(
  token: string,
  bookingId: string,
): Promise<CancelBookingResult> {
  const result = await apiRequest<CancelBookingResult>(`/bookings/${bookingId}`, {
    method: 'DELETE',
    token,
  })
  return result.data
}
