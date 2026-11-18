import { getStatusLabel, type BookingStatus } from '@/lib/booking-view'

const TONES: Record<BookingStatus, string> = {
  CONFIRMED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  WAITLIST: 'border-amber-200 bg-amber-50 text-amber-900',
  CANCELLED: 'border-zinc-200 bg-zinc-100 text-zinc-700',
  NOSHOW: 'border-rose-200 bg-rose-50 text-rose-800',
}

/** El texto acompaña al color: el estado nunca se comunica solo con el tono. */
export function BookingStatusBadge({
  status,
  waitlistPosition,
}: {
  status: BookingStatus
  waitlistPosition?: number | null
}) {
  return (
    <span
      data-testid="booking-status-badge"
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${TONES[status]}`}
    >
      {getStatusLabel(status, waitlistPosition)}
    </span>
  )
}
