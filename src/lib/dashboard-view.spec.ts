import { describe, expect, it } from 'vitest'
import { formatTime } from '@/lib/datetime'
import { toPanelGeneralView } from '@/lib/dashboard-view'
import { formatCurrency } from '@/lib/membership-display'
import type { Wod } from '@/types/api'

function makeWod(startTime: string, id: string, title = 'Fuerza + metcon'): Wod {
  const end = new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString()
  return {
    wod_id: id,
    coach_id: null,
    title,
    description: null,
    start_time: startTime,
    end_time: end,
    max_capacity: 12,
    confirmed_count: 0,
    available_slots: 12,
    waitlist_count: 0,
    created_at: '2026-11-01T12:00:00Z',
  }
}

describe('toPanelGeneralView', () => {
  it('deriva los contadores de meta.total, nunca de data.length (limit=1)', () => {
    const athletesPage = { limit: 1, total: 148 }
    const membershipsPage = { limit: 1, total: 18 }

    const view = toPanelGeneralView({
      athletesTotal: athletesPage.total,
      membershipsTotal: membershipsPage.total,
    })

    expect(view.totalAthletes).toBe(148)
    expect(view.totalMemberships).toBe(18)
    expect(view.totalAthletes).not.toBe(athletesPage.limit)
    expect(view.totalMemberships).not.toBe(membershipsPage.limit)
  })

  it('devuelve null para métricas sin fuente: no generan tarjeta', () => {
    const view = toPanelGeneralView({})

    expect(view.totalAthletes).toBeNull()
    expect(view.totalMemberships).toBeNull()
    expect(view.collectedAmount).toBeNull()
    expect(view.nextWods).toEqual([])
  })

  it('formatea el importe del diseño con es-PY/PYG', () => {
    expect(formatCurrency(6240000)).toBe('$6.240.000')
    expect(toPanelGeneralView({}).collectedAmount).toBeNull()
  })

  it('convierte 18:00Z a 15:00 en America/Asuncion y ordena hasta 5 turnos', () => {
    expect(formatTime('2026-11-17T18:00:00Z')).toBe('15:00')

    const wods = [
      makeWod('2026-11-17T20:00:00Z', 'wod-3', 'WOD tarde'),
      makeWod('2026-11-17T18:00:00Z', 'wod-1', 'WOD'),
      makeWod('2026-11-17T19:00:00Z', 'wod-2', 'Fuerza'),
      makeWod('2026-11-18T13:00:00Z', 'wod-5', 'Mañana'),
      makeWod('2026-11-18T14:00:00Z', 'wod-6', 'Fuera de alcance'),
      makeWod('2026-11-18T12:00:00Z', 'wod-4', 'Otro día'),
    ]

    const view = toPanelGeneralView({ wods })

    expect(view.nextWods).toHaveLength(5)
    expect(view.nextWods.map((wod) => wod.timeLabel)).toEqual([
      '15:00',
      '16:00',
      '17:00',
      '09:00',
      '10:00',
    ])
    expect(view.nextWods[0].wod_id).toBe('wod-1')
    expect(view.nextWods[0].availableSlots).toBe(12)
    expect(view.nextWods.map((wod) => wod.wod_id)).not.toContain('wod-6')
  })
})
