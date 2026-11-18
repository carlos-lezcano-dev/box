import type { Booking } from '@/types/api'

export type BookingStatus = Booking['status']

export type BookingView = {
  booking_id: string
  wod_id: string
  title: string
  coach_full_name: string | null
  start_time: string
  end_time: string
  status: BookingStatus
  waitlist_position: number | null
  available_slots: number
  statusLabel: string
  waitlistLabel: string | null
  canCancel: boolean
  slotLabel: string
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  CONFIRMED: 'Confirmada',
  WAITLIST: 'Lista de espera',
  CANCELLED: 'Cancelada',
  NOSHOW: 'No show',
}

/** Nunca devuelve `#null`: solo posiciones positivas delante de `#`. */
export function formatWaitlistPosition(position: number | null | undefined): string | null {
  if (typeof position !== 'number' || !Number.isFinite(position) || position < 1) return null
  return `#${Math.trunc(position)}`
}

/** `Lista de espera #3`, o solo `Lista de espera` si no hay posición. */
export function getWaitlistLabel(position: number | null | undefined): string {
  const suffix = formatWaitlistPosition(position)
  return suffix ? `${STATUS_LABELS.WAITLIST} ${suffix}` : STATUS_LABELS.WAITLIST
}

export function getStatusLabel(
  status: BookingStatus,
  waitlistPosition?: number | null,
): string {
  if (status === 'WAITLIST') return getWaitlistLabel(waitlistPosition)
  return STATUS_LABELS[status]
}

export function isActiveStatus(status: BookingStatus): boolean {
  return status === 'CONFIRMED' || status === 'WAITLIST'
}

export function filterActive<T extends { status: BookingStatus }>(bookings: readonly T[]): T[] {
  return bookings.filter((booking) => isActiveStatus(booking.status))
}

export function sortByStartTime<T extends { start_time: string }>(
  bookings: readonly T[],
): T[] {
  return [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time))
}

export function toBookingView(booking: Booking, now: Date = new Date()): BookingView {
  const start = Date.parse(booking.wod.start_time)
  const availableSlots = booking.wod.available_slots ?? 0
  const position = booking.waitlist_position ?? null

  return {
    booking_id: booking.booking_id,
    wod_id: booking.wod_id,
    title: booking.wod.title || 'WOD',
    coach_full_name: booking.wod.coach_full_name ?? null,
    start_time: booking.wod.start_time,
    end_time: booking.wod.end_time,
    status: booking.status,
    waitlist_position: position,
    available_slots: availableSlots,
    statusLabel: getStatusLabel(booking.status, position),
    waitlistLabel: booking.status === 'WAITLIST' ? getWaitlistLabel(position) : null,
    canCancel:
      isActiveStatus(booking.status) &&
      Number.isFinite(start) &&
      start > now.getTime(),
    slotLabel: availableSlots > 0 ? 'Libre' : 'Sin cupo',
  }
}

/** Agrupación usada por la vista: confirmadas primero, espera después. */
export function groupByStatus(bookings: readonly BookingView[]): {
  confirmed: BookingView[]
  waitlist: BookingView[]
} {
  return {
    confirmed: bookings.filter((booking) => booking.status === 'CONFIRMED'),
    waitlist: bookings.filter((booking) => booking.status === 'WAITLIST'),
  }
}
