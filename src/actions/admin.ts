'use server'

import { ApiError } from '@/api/client'
import { cancelWod, createWod, updateWod } from '@/api/admin-wods'
import { registerUser } from '@/api/admin-users'
import { cancelBooking as removeBooking } from '@/api/admin-bookings'
import {
  createMembership,
  updateMembershipStatus,
} from '@/api/admin-memberships'
import { actionFailure, getErrorMessage } from '@/lib/errors'
import { getCurrentUser, getToken } from '@/lib/session'
import type { ActionResult } from '@/types/api'

type MembershipStatusValue = 'ACTIVE' | 'FROZEN' | 'CANCELLED'

type CreateUserInput = {
  email: string
  password: string
  full_name: string
  phone?: string
  emergency_contact?: string
  role?: 'ATHLETE' | 'COACH' | 'ADMIN'
}

type CreateWodInput = {
  title: string
  description?: string
  start_time: string
  end_time: string
  max_capacity?: number
  coach_id?: string
}

type UpdateWodInput = Partial<Omit<CreateWodInput, 'coach_id'>> & {
  coach_id?: string | null
}

type CreateMembershipInput = {
  user_id: string
  plan_name: string
  amount_paid: number
  start_date: string
  end_date: string
  payment_method: 'CASH' | 'TRANSFER' | 'CREDIT_CARD'
  notes?: string
}

async function run(
  action: (token: string) => Promise<unknown>,
  describeSuccess?: (data: unknown) => string,
): Promise<ActionResult> {
  const token = await getToken()
  if (!token) {
    return actionFailure('AUTH_TOKEN_MISSING', getErrorMessage('AUTH_TOKEN_MISSING'))
  }
  try {
    const data = await action(token)
    return { ok: true, ...(describeSuccess ? { message: describeSuccess(data) } : {}) }
  } catch (error) {
    if (error instanceof ApiError) {
      return actionFailure(
        error.code,
        getErrorMessage(error.code, error.message),
        error.requestId,
        error.details,
      )
    }
    return actionFailure('INTERNAL_ERROR', getErrorMessage('INTERNAL_ERROR'))
  }
}

export async function createUserAction(input: CreateUserInput) {
  // `@OptionalAuth()` en el backend: un token vencido adjunto produce 401.
  // Validamos la sesión antes de llamar a /users/register y no reintentamos.
  const user = await getCurrentUser()
  if (!user) {
    return actionFailure('AUTH_TOKEN_EXPIRED', getErrorMessage('AUTH_TOKEN_EXPIRED'))
  }
  return run((token) => registerUser(token, input))
}

export async function createWodAction(input: CreateWodInput) {
  return run((token) => createWod(token, input))
}

export async function updateWodAction(wodId: string, input: UpdateWodInput) {
  return run((token) => updateWod(token, wodId, input))
}

export async function cancelWodAction(wodId: string) {
  return run(
    (token) => cancelWod(token, wodId),
    (data) => {
      const result = data as { cancelled_bookings?: number }
      return `Turno cancelado. Se cancelaron ${result.cancelled_bookings ?? 0} reservas.`
    },
  )
}

export async function cancelBookingAction(bookingId: string) {
  return run(
    (token) => removeBooking(token, bookingId),
    (data) => {
      const result = data as { promoted?: boolean }
      return result.promoted
        ? 'Se promovió a la siguiente persona de la lista de espera.'
        : 'La reserva se canceló correctamente.'
    },
  )
}

export async function createMembershipAction(
  input: CreateMembershipInput,
  idempotencyKey: string,
) {
  return run((token) => createMembership(token, input, idempotencyKey))
}

export async function updateMembershipStatusAction(
  membershipId: string,
  status: MembershipStatusValue,
) {
  return run((token) => updateMembershipStatus(token, membershipId, status))
}
