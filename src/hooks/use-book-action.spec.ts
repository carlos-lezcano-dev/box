import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const refreshMock = vi.fn()
  return {
    bookMock: vi.fn(),
    refreshMock,
    router: { refresh: refreshMock },
  }
})

vi.mock('@/actions/bookings', () => ({ bookWodAction: mocks.bookMock }))
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }))

import { useBookAction } from '@/hooks/use-book-action'

describe('useBookAction', () => {
  let counter: number

  beforeEach(() => {
    counter = 0
    mocks.bookMock.mockReset()
    mocks.bookMock.mockResolvedValue({
      ok: true,
      data: { booking_id: 'booking-1', status: 'CONFIRMED' },
    })
    mocks.refreshMock.mockReset()
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => `key-${++counter}`),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reutiliza la misma Idempotency-Key en reintentos y la cambia al cambiar de turno', async () => {
    const { result, rerender } = renderHook(
      ({ wodId }) => useBookAction(wodId, { hasActiveMembership: true }),
      { initialProps: { wodId: 'wod-1' } },
    )

    await act(async () => {
      await result.current.book()
    })
    await act(async () => {
      await result.current.book()
    })

    expect(mocks.bookMock).toHaveBeenCalledTimes(2)
    expect(mocks.bookMock.mock.calls.map((call) => call[1])).toEqual([
      'key-1',
      'key-1',
    ])
    expect(mocks.refreshMock).toHaveBeenCalledTimes(2)

    rerender({ wodId: 'wod-2' })
    await act(async () => {
      await result.current.book()
    })

    expect(mocks.bookMock).toHaveBeenLastCalledWith('wod-2', 'key-2')
  })

  it('sin membresía muestra el aviso y no envía la reserva', async () => {
    const { result } = renderHook(() =>
      useBookAction('wod-1', { hasActiveMembership: false }),
    )

    await act(async () => {
      await result.current.book()
    })

    expect(mocks.bookMock).not.toHaveBeenCalled()
    expect(result.current.notice).toMatchObject({
      kind: 'error',
      code: 'MEMBERSHIP_REQUIRED',
      href: '/memberships',
    })
  })

  it('regenera la clave sólo después de confirmar un IDEMPOTENCY_CONFLICT', async () => {
    mocks.bookMock
      .mockResolvedValueOnce({
        ok: false,
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Clave reutilizada con otros datos.',
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { booking_id: 'booking-2', status: 'CONFIRMED' },
      })

    const { result } = renderHook(() =>
      useBookAction('wod-1', { hasActiveMembership: true }),
    )

    await act(async () => {
      await result.current.book()
    })
    expect(result.current.needsConfirmation).toBe(true)
    expect(mocks.bookMock.mock.calls[0][1]).toBe('key-1')

    await act(async () => {
      result.current.confirmRetry()
    })
    await waitFor(() => expect(mocks.bookMock).toHaveBeenCalledTimes(2))
    expect(mocks.bookMock.mock.calls[1][1]).toBe('key-2')
  })
})
