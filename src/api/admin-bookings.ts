import { apiRequest } from '@/api/client'
import type { CancelBookingResult, WodRoster } from '@/types/api'

export async function getWodRoster(token: string, wodId: string) {
  const { data } = await apiRequest<WodRoster>(`/wods/${wodId}/bookings`, { token })
  return data
}

export async function cancelBooking(token: string, bookingId: string) {
  const { data } = await apiRequest<CancelBookingResult>(`/bookings/${bookingId}`, {
    method: 'DELETE',
    token,
  })
  return data
}
