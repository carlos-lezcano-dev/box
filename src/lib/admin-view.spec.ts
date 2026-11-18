import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from '@/api/client'
import {
  canChangeStatus,
  getCapacityLabel,
  getCreatedAtLabel,
  getInitials,
  getMembershipLabel,
  getRoleLabel,
  getStatusLabel,
  getUserMetrics,
  STATUS_TRANSITIONS,
  toRosterView,
} from '@/lib/admin-view'
import { getWeekRange } from '@/lib/datetime'
import { actionFailure } from '@/lib/errors'
import type { WodRoster } from '@/types/api'

const meta = (total: number) => ({ page: 1, limit: 1, total, total_pages: total > 0 ? 1 : 0 })

describe('admin-view', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 12:00 del 17/11/2026 en America/Asuncion (UTC-3).
    vi.setSystemTime(new Date('2026-11-17T15:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('getUserMetrics lee los cuatro meta.total (156/148/6/2)', () => {
    const wrapped = (total: number) => ({ meta: meta(total) })
    expect(
      getUserMetrics(wrapped(156), wrapped(148), wrapped(6), wrapped(2)),
    ).toEqual({
      todos: 156,
      atletas: 148,
      entrenadores: 6,
      administradores: 2,
    })
  })

  it('getUserMetrics tolera respuesta sin meta', () => {
    expect(getUserMetrics({}, {}, {}, {})).toEqual({
      todos: 0,
      atletas: 0,
      entrenadores: 0,
      administradores: 0,
    })
  })

  it('getRoleLabel usa las etiquetas del diseño', () => {
    expect(getRoleLabel('ATHLETE')).toBe('Atleta')
    expect(getRoleLabel('COACH')).toBe('Entrenador')
    expect(getRoleLabel('ADMIN')).toBe('Administrador')
  })

  it('getCreatedAtLabel delega en formatCreatedAt con reloj fijo', () => {
    expect(getCreatedAtLabel('2026-11-17T12:12:00.000Z')).toBe('Hoy, 09:12')
    expect(getCreatedAtLabel('2026-10-28T12:12:00.000Z')).toBe('mié 28, 09:12')
  })

  it('getWeekRange del 28/10 va de lunes 26 a viernes 30 y envía sábado 00:00', () => {
    const week = getWeekRange('2026-10-28')

    expect(week.monday.toISOString().slice(0, 10)).toBe('2026-10-26')
    expect(week.friday.toISOString().slice(0, 10)).toBe('2026-10-30')
    expect(week.saturday.toISOString().slice(0, 10)).toBe('2026-10-31')
    expect(week.fromIso).toBe('2026-10-26T03:00:00.000Z')
    expect(week.toIso).toBe('2026-10-31T03:00:00.000Z')
    expect(new Date(week.toIso).getUTCDay()).toBe(6) // sábado, nunca viernes
    expect(week.label).toBe('26 - 30 de octubre')
  })

  it('getInitials deriva del full_name y usa ? cuando no hay nombre', () => {
    expect(getInitials('Camila Ruiz')).toBe('CR')
    expect(getInitials('  Camila   Ruiz  ')).toBe('CR')
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })

  it('getCapacityLabel y toRosterView ordenan la waitlist por position ASC', () => {
    expect(getCapacityLabel(12, 12)).toBe('AFORO 12/12')

    const roster: WodRoster = {
      wod_id: 'wod-1',
      max_capacity: 12,
      confirmed_count: 12,
      waitlist_count: 3,
      confirmed: [],
      waitlist: [
        {
          booking_id: 'b3',
          user_id: 'u3',
          full_name: 'Tercero',
          booked_at: '2026-11-17T12:00:00.000Z',
          position: 3,
        },
        {
          booking_id: 'b1',
          user_id: 'u1',
          full_name: 'Primero',
          booked_at: '2026-11-17T12:01:00.000Z',
          position: 1,
        },
        {
          booking_id: 'b2',
          user_id: 'u2',
          full_name: 'Segundo',
          booked_at: '2026-11-17T12:02:00.000Z',
          position: 2,
        },
      ],
    }

    expect(toRosterView(roster).waitlist.map((entry) => entry.position)).toEqual([1, 2, 3])
    expect(roster.waitlist.map((entry) => entry.position)).toEqual([3, 1, 2])
  })

  it('getStatusLabel y canChangeStatus respetan las transiciones válidas', () => {
    expect(getStatusLabel('ACTIVE')).toBe('Activa')
    expect(getMembershipLabel('FROZEN')).toBe('Congelada')
    expect(canChangeStatus('ACTIVE', 'FROZEN')).toBe(true)
    expect(canChangeStatus('CANCELLED', 'ACTIVE')).toBe(false)
    expect(canChangeStatus('EXPIRED', 'ACTIVE')).toBe(false)
    expect(STATUS_TRANSITIONS.CANCELLED).toEqual([])
  })

  it('ApiError expone code/status/requestId y el importe inválido se mapea por field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: { get: () => null },
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Un mensaje que no debe decidir la UI',
            details: [
              {
                field: 'amount_paid',
                rule: 'number.gte',
                message: 'El importe no es válido.',
              },
            ],
          },
          request_id: 'req-abc-123',
        }),
      }),
    )

    let caught: unknown
    try {
      await apiRequest('/memberships', { method: 'POST', token: 'token', body: {} })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(ApiError)
    const apiError = caught as ApiError
    expect(apiError.code).toBe('VALIDATION_ERROR')
    expect(apiError.status).toBe(400)
    expect(apiError.requestId).toBe('req-abc-123')
    expect(apiError.details[0]?.field).toBe('amount_paid')
    // La UI decide por code/details, nunca por el texto de message.
    expect('request_id' in apiError).toBe(false)

    const result = actionFailure(
      apiError.code,
      apiError.message,
      apiError.requestId,
      apiError.details,
    )
    expect(result.code).toBe('VALIDATION_ERROR')
    expect(result.requestId).toBe('req-abc-123')
    expect(result.fields?.amount_paid).toBe('El importe no es válido.')
  })
})
