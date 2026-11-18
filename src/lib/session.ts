import { cache } from 'react'
import { cookies } from 'next/headers'
import { ApiError } from '@/api/client'
import { getMe } from '@/api/users'
import { SESSION_COOKIE } from '@/lib/constants'
import { AUTH_CODES, UnauthorizedError } from '@/lib/errors'
import type { CurrentUser } from '@/types/api'

export async function getToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(SESSION_COOKIE)?.value ?? null
}

/**
 * Memoizado por request: el shell y el guard de F7 comparten una sola llamada
 * a `/users/me`. Debe invocarse dentro de un `<Suspense>` porque lee cookies.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getToken()
  if (!token) return null

  try {
    return await getMe(token)
  } catch (error) {
    if (error instanceof ApiError && AUTH_CODES.has(error.code)) return null
    throw error
  }
})

/** Alias del nombre usado en los planes de F1. */
export const getSessionToken = getToken

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}
