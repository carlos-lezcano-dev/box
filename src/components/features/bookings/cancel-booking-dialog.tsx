'use client'

import { useEffect, useRef } from 'react'
import { formatEventDate } from '@/lib/datetime'
import type { BookingView } from '@/lib/booking-view'
import type { CancelBookingError } from '@/hooks/use-cancel-booking'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function CancelBookingDialog({
  open,
  booking,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean
  booking: BookingView
  pending: boolean
  error: CancelBookingError | null
  onClose: () => void
  onConfirm: () => void | Promise<void>
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    backRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const focusables = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      const target = previouslyFocused.current
      if (target?.isConnected) target.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        aria-describedby="cancel-booking-description"
        className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl outline-none"
      >
        <h2 id="cancel-booking-title" className="text-xl font-semibold">
          ¿Cancelar tu reserva?
        </h2>
        <p id="cancel-booking-description" className="mt-3 text-sm leading-6 text-muted">
          Vas a cancelar tu lugar en{' '}
          <strong className="font-semibold text-foreground">{booking.title}</strong>.
          <br />
          <time dateTime={booking.start_time}>
            {formatEventDate(booking.start_time, booking.end_time)}
          </time>
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
          >
            {error.message}
          </p>
        )}

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={backRef}
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? 'Cancelando…' : 'Confirmar cancelación'}
          </button>
        </div>
      </div>
    </div>
  )
}
