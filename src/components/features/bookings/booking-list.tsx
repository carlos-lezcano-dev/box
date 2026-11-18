'use client'

import { useCancelBooking } from '@/hooks/use-cancel-booking'
import { groupByStatus, type BookingView } from '@/lib/booking-view'
import { BookingGroup } from './booking-group'

export function BookingList({ bookings }: { bookings: BookingView[] }) {
  const { cancel, pending, error, notice, clearError } = useCancelBooking()
  const { confirmed, waitlist } = groupByStatus(bookings)

  return (
    <div>
      <div
        role={notice?.tone === 'error' ? 'alert' : 'status'}
        aria-live={notice?.tone === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
        data-testid="booking-notice"
        className={
          notice
            ? notice.tone === 'error'
              ? 'mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900'
              : 'mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900'
            : 'sr-only'
        }
      >
        {notice?.message}
      </div>

      <BookingGroup
        id="confirmed"
        title="Reservas confirmadas"
        bookings={confirmed}
        pending={pending}
        error={error}
        onConfirmCancel={cancel}
        onDismissError={clearError}
      />
      <BookingGroup
        id="waitlist"
        title="Lista de espera"
        bookings={waitlist}
        pending={pending}
        error={error}
        onConfirmCancel={cancel}
        onDismissError={clearError}
      />
    </div>
  )
}
