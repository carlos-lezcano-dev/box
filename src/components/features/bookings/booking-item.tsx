'use client'

import { useState } from 'react'
import { formatDayLabel, formatEventDate, formatTime } from '@/lib/datetime'
import type { BookingView } from '@/lib/booking-view'
import type { CancelBookingError, CancelOutcome } from '@/hooks/use-cancel-booking'
import { BookingStatusBadge } from './booking-status-badge'
import { CancelBookingDialog } from './cancel-booking-dialog'

export type BookingCancelProps = {
  pending: boolean
  error: CancelBookingError | null
  onConfirmCancel: (bookingId: string) => Promise<CancelOutcome>
  onDismissError: () => void
}

export function BookingItem({
  booking,
  pending,
  error,
  onConfirmCancel,
  onDismissError,
}: { booking: BookingView } & BookingCancelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const day = formatDayLabel(booking.start_time)
  const time = formatTime(booking.start_time)

  async function handleConfirm() {
    const result = await onConfirmCancel(booking.booking_id)
    if (result.shouldClose) setDialogOpen(false)
  }

  function handleClose() {
    setDialogOpen(false)
    onDismissError()
  }

  return (
    <li
      data-testid="booking-item"
      className="rounded-2xl border bg-surface p-4 shadow-sm md:p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="min-w-0 flex-1">
          <p data-testid="booking-when" className="text-xs font-semibold uppercase tracking-wide text-muted">
            {day}, {time}
          </p>
          <h3 className="mt-2 truncate text-base font-semibold">{booking.title}</h3>
          <p className="mt-1 text-sm text-muted">
            <time dateTime={booking.start_time}>
              {formatEventDate(booking.start_time, booking.end_time)}
            </time>
          </p>
          <p className="mt-2 text-xs text-muted">
            Coach: {booking.coach_full_name ?? 'Sin asignar'} · {booking.slotLabel}
          </p>
          {booking.waitlistLabel && (
            <p className="mt-1 text-xs font-medium text-amber-900">{booking.waitlistLabel}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 md:shrink-0 md:justify-end">
          <BookingStatusBadge
            status={booking.status}
            waitlistPosition={booking.waitlist_position}
          />
          {booking.canCancel && (
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-800 hover:bg-red-50"
            >
              Cancelar reserva
            </button>
          )}
        </div>
      </div>

      <CancelBookingDialog
        open={dialogOpen}
        booking={booking}
        pending={pending}
        error={error}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </li>
  )
}
