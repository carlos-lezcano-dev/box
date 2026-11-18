'use server'

import { ApiError } from '@/api/client'
import { cancelBooking, createBooking } from '@/api/bookings'
import { actionFailure, getErrorMessage } from '@/lib/errors'
import { getToken } from '@/lib/session'
import type {
  ActionResult,
  CancelBookingResult,
  CreateBookingResult,
} from '@/types/api'

function fail<T>(error: unknown): ActionResult<T> {
  if (error instanceof ApiError) {
    return {
      ...(actionFailure(
        error.code,
        getErrorMessage(error.code, error.message),
        error.requestId,
        error.details,
      ) as ActionResult<T>),
      retryAfter: error.retryAfter,
    }
  }
  return actionFailure('INTERNAL_ERROR', getErrorMessage('INTERNAL_ERROR')) as ActionResult<T>
}

function missingToken<T>(): ActionResult<T> {
  return actionFailure(
    'AUTH_TOKEN_MISSING',
    getErrorMessage('AUTH_TOKEN_MISSING'),
  ) as ActionResult<T>
}

export async function bookWodAction(
  wodId: string,
  idempotencyKey: string,
): Promise<ActionResult<CreateBookingResult & { statusText?: string }>> {
  const token = await getToken()
  if (!token) return missingToken()
  try {
    const data = await createBooking(token, wodId, idempotencyKey)
    return { ok: true, data }
  } catch (error) {
    return fail(error)
  }
}

export async function cancelBookingAction(
  bookingId: string,
): Promise<ActionResult<CancelBookingResult>> {
  const token = await getToken()
  if (!token) return missingToken()
  try {
    const data = await cancelBooking(token, bookingId)
    return {
      ok: true,
      data,
      message: data.promoted
        ? 'Reserva cancelada. Un atleta de la lista de espera ocupó tu lugar.'
        : 'Reserva cancelada.',
    }
  } catch (error) {
    return fail(error)
  }
}
