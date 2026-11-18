'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBookingAction } from '@/actions/bookings'
import { AUTH_CODES, getErrorMessage } from '@/lib/errors'

export const PROMOTED_NOTICE = 'Se promovió a la siguiente persona de la lista de espera'

export type CancelBookingError = {
  code: string
  message: string
  retryAfter?: string
  keepsBooking: boolean
  reloadsList: boolean
}

export type CancelOutcome = {
  ok: boolean
  shouldClose: boolean
  promoted: boolean
}

export type BookingNotice = {
  message: string
  tone: 'success' | 'error'
}

type Failure = Omit<CancelBookingError, 'code' | 'message'> & {
  message: string
  shouldClose: boolean
  redirectToLogin?: boolean
}

function mapFailure(code: string, message: string | undefined, retryAfter?: string): Failure {
  switch (code) {
    case 'BOOKING_ALREADY_CANCELLED':
      return {
        message: 'Ya estaba cancelada.',
        keepsBooking: false,
        reloadsList: true,
        shouldClose: true,
      }
    case 'BOOKING_NOT_FOUND':
      return {
        message: 'No encontramos esa reserva.',
        keepsBooking: false,
        reloadsList: true,
        shouldClose: true,
      }
    case 'BOOKING_CANCELLATION_CLOSED':
      return {
        message: `${getErrorMessage(code)} La reserva sigue vigente.`,
        keepsBooking: true,
        reloadsList: false,
        shouldClose: false,
      }
    case 'BOOKING_NOT_OWNER':
      // No exponemos datos de la reserva ajena.
      return {
        message: 'No se pudo cancelar la reserva.',
        keepsBooking: true,
        reloadsList: false,
        shouldClose: false,
      }
    case 'RATE_LIMITED': {
      const seconds = retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) : null
      return {
        message: `${getErrorMessage(code)}${seconds ? ` Reintentá en ${seconds} s.` : ''}`,
        retryAfter,
        keepsBooking: true,
        reloadsList: false,
        shouldClose: false,
      }
    }
    default:
      return {
        message: getErrorMessage(code, message),
        keepsBooking: true,
        reloadsList: false,
        shouldClose: false,
        redirectToLogin: AUTH_CODES.has(code),
      }
  }
}

/** Cancelación no optimista: el aviso y el refresco ocurren solo tras la respuesta del backend. */
export function useCancelBooking() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<CancelBookingError | null>(null)
  const [notice, setNotice] = useState<BookingNotice | null>(null)
  const inFlight = useRef(false)

  const clearError = useCallback(() => setError(null), [])

  const cancel = useCallback(
    async (bookingId: string): Promise<CancelOutcome> => {
      if (inFlight.current) return { ok: false, shouldClose: false, promoted: false }

      inFlight.current = true
      setPending(true)
      setError(null)
      setNotice(null)

      try {
        const result = await cancelBookingAction(bookingId)
        if (result.ok) {
          const promoted = result.data?.promoted === true
          setNotice({
            message: promoted ? PROMOTED_NOTICE : 'Reserva cancelada.',
            tone: 'success',
          })
          router.refresh()
          return { ok: true, shouldClose: true, promoted }
        }

        const code = result.code ?? 'INTERNAL_ERROR'
        const failure = mapFailure(code, result.message, result.retryAfter)
        if (failure.shouldClose) {
          // El diálogo se cierra en el mismo tick: el aviso debe vivir en la lista.
          setNotice({ message: failure.message, tone: 'error' })
        } else {
          setError({
            code,
            message: failure.message,
            retryAfter: failure.retryAfter,
            keepsBooking: failure.keepsBooking,
            reloadsList: failure.reloadsList,
          })
        }
        if (failure.reloadsList) router.refresh()
        if (failure.redirectToLogin) router.replace('/login')
        return { ok: false, shouldClose: failure.shouldClose, promoted: false }
      } finally {
        inFlight.current = false
        setPending(false)
      }
    },
    [router],
  )

  return { cancel, pending, error, notice, clearError }
}
