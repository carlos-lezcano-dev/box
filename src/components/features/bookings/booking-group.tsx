import type { BookingView } from '@/lib/booking-view'
import { BookingItem, type BookingCancelProps } from './booking-item'

export function BookingGroup({
  id,
  title,
  bookings,
  ...cancelProps
}: { id: string; title: string; bookings: BookingView[] } & BookingCancelProps) {
  if (bookings.length === 0) return null

  return (
    <section aria-labelledby={`${id}-heading`} className="mb-9 last:mb-0">
      <div className="mb-4 flex items-center gap-3">
        <h2 id={`${id}-heading`} className="text-lg font-semibold">
          {title}
        </h2>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-muted">
          {bookings.length}
        </span>
      </div>
      <ul className="space-y-3" data-testid={`${id}-group`}>
        {bookings.map((booking) => (
          <BookingItem key={booking.booking_id} booking={booking} {...cancelProps} />
        ))}
      </ul>
    </section>
  )
}
