import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookiesMock = vi.hoisted(() => vi.fn())
vi.mock('next/headers', () => ({ cookies: cookiesMock }))

import { getSessionToken, getToken } from '@/lib/session'

describe('getSessionToken', () => {
  beforeEach(() => {
    cookiesMock.mockReset()
  })

  it('devuelve el valor de la cookie box_session', async () => {
    cookiesMock.mockResolvedValue({
      get: (name: string) =>
        name === 'box_session' ? { name, value: 'jwt-token' } : undefined,
    })

    await expect(getSessionToken()).resolves.toBe('jwt-token')
    expect(cookiesMock).toHaveBeenCalledTimes(1)
  })

  it('devuelve null cuando la cookie no existe', async () => {
    cookiesMock.mockResolvedValue({ get: () => undefined })

    await expect(getSessionToken()).resolves.toBeNull()
  })

  it('getToken es un alias de getSessionToken', () => {
    expect(getToken).toBe(getSessionToken)
  })
})
