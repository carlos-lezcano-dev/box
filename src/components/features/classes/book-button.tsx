'use client'

import { useBookAction } from '@/hooks/use-book-action'
import type { BookingNotice } from '@/hooks/use-book-action'

export function BookButton({
  wodId,
  availableSlots,
  isStarted,
  hasActiveMembership,
  statusId,
  describedBy,
  onResult,
}: {
  wodId: string
  availableSlots: number
  isStarted: boolean
  hasActiveMembership: boolean
  statusId: string
  describedBy?: string
  onResult: (notice: BookingNotice) => void
}) {
  const { book, confirmRetry, pending, needsConfirmation } = useBookAction(
    wodId,
    { hasActiveMembership, isStarted, onResult },
  )

  const disabled = isStarted || !hasActiveMembership || pending
  const reasonId = `book-reason-${wodId}`
  const reason = isStarted
    ? 'El turno ya comenzó.'
    : !hasActiveMembership
      ? 'Necesitás una membresía activa para reservar; mirá el enlace a membresías.'
      : undefined

  return (
    <div className="mt-auto pt-5">
      <button
        type="button"
        onClick={() => void book()}
        disabled={disabled}
        aria-describedby={[statusId, reason && reasonId, describedBy]
          .filter(Boolean)
          .join(' ')}
        data-testid="book-button"
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? 'Reservando…'
          : availableSlots === 0
            ? 'Entrar en lista de espera'
            : 'Reservar'}
      </button>
      {reason && (
        <p id={reasonId} className="mt-2 text-xs text-muted">
          {reason}
        </p>
      )}
      {needsConfirmation && (
        <button
          type="button"
          onClick={confirmRetry}
          className="mt-2 text-xs font-medium underline"
        >
          Confirmar y reintentar
        </button>
      )}
    </div>
  )
}
