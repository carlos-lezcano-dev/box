'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { bookWodAction } from '@/actions/bookings'
import { getErrorMessage } from '@/lib/errors'

export type BookingNotice = {
  kind: 'success' | 'waitlist' | 'error'
  message: string
  code?: string
  href?: string
  ctaLabel?: string
}

type BookActionOptions = {
  hasActiveMembership: boolean
  isStarted?: boolean
  onResult?: (notice: BookingNotice) => void
}

const MEMBERSHIP_NOTICE: BookingNotice = {
  kind: 'error',
  code: 'MEMBERSHIP_REQUIRED',
  message: 'Se requiere una membresía activa para reservar.',
  href: '/memberships',
  ctaLabel: 'Ver membresías',
}

function retryAfterSeconds(value?: string): number | null {
  if (!value) return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(1, Math.ceil(seconds))
  const date = Date.parse(value)
  if (!Number.isNaN(date)) return Math.max(1, Math.ceil((date - Date.now()) / 1000))
  return null
}

/**
 * Una intención de reserva = una Idempotency-Key. La clave se reutiliza en
 * reintentos y sólo cambia al cambiar de turno o al confirmar un conflicto.
 */
export function useBookAction(wodId: string, options: BookActionOptions) {
  const router = useRouter()
  const { hasActiveMembership, isStarted = false, onResult } = options

  const [intentVersion, setIntentVersion] = useState(0)
  // La clave es estable por intención: cambia con el turno o con la confirmación.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [wodId, intentVersion])
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<BookingNotice | null>(null)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  const inFlight = useRef(false)
  const pendingConfirm = useRef(false)
  const onResultRef = useRef(onResult)

  useEffect(() => {
    onResultRef.current = onResult
  }, [onResult])

  const emit = useCallback((next: BookingNotice) => {
    setNotice(next)
    onResultRef.current?.(next)
  }, [])

  const run = useCallback(
    async (key: string) => {
      if (inFlight.current) return
      if (isStarted) {
        emit({
          kind: 'error',
          code: 'WOD_ALREADY_STARTED',
          message: getErrorMessage('WOD_ALREADY_STARTED'),
        })
        return
      }
      if (!hasActiveMembership) {
        emit(MEMBERSHIP_NOTICE)
        return
      }

      inFlight.current = true
      setPending(true)
      try {
        const result = await bookWodAction(wodId, key)
        if (result.ok) {
          const data = result.data
          const status = data?.status ?? data?.statusText
          if (status === 'WAITLIST' || data?.waitlist_position != null) {
            emit({
              kind: 'waitlist',
              message: `Ingresaste a la lista de espera. Tu posición es ${data?.waitlist_position ?? 1}.`,
            })
          } else {
            emit({ kind: 'success', message: 'Reserva confirmada' })
          }
          router.refresh()
          return
        }

        const code = result.code ?? 'INTERNAL_ERROR'
        const fallback = getErrorMessage(code, result.message)
        switch (code) {
          case 'MEMBERSHIP_REQUIRED':
            emit(MEMBERSHIP_NOTICE)
            break
          case 'BOOKING_ALREADY_EXISTS':
            emit({
              kind: 'error',
              code,
              message: fallback,
              href: '/bookings',
              ctaLabel: 'Ver mis reservas',
            })
            break
          case 'IDEMPOTENCY_CONFLICT':
            setNeedsConfirmation(true)
            emit({
              kind: 'error',
              code,
              message: fallback,
              ctaLabel: 'Confirmar y reintentar',
            })
            break
          case 'RATE_LIMITED': {
            const seconds = retryAfterSeconds(result.retryAfter)
            emit({
              kind: 'error',
              code,
              message: seconds
                ? `Demasiados intentos. Volvé a probar en ${seconds} segundos.`
                : fallback,
            })
            break
          }
          default:
            emit({ kind: 'error', code, message: fallback })
        }
      } finally {
        inFlight.current = false
        setPending(false)
      }
    },
    [emit, hasActiveMembership, isStarted, router, wodId],
  )

  const book = useCallback(() => run(idempotencyKey), [idempotencyKey, run])

  const confirmRetry = useCallback(() => {
    pendingConfirm.current = true
    setNeedsConfirmation(false)
    setIntentVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    if (!pendingConfirm.current) return
    pendingConfirm.current = false
    void run(idempotencyKey)
  }, [idempotencyKey, run])

  return {
    book,
    confirmRetry,
    pending,
    notice,
    needsConfirmation,
    idempotencyKey,
  }
}
