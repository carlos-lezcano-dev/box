import { describe, expect, it } from 'vitest'
import {
  filterClasses,
  getDefaultSelection,
  getSlotBadge,
  getSlotTimes,
  groupClassesByDay,
  resolveClassRange,
  toClassView,
} from '@/lib/class-view'
import type { Wod } from '@/types/api'

const now = new Date('2026-11-17T15:00:00.000Z')

function wod(overrides: Partial<Wod> = {}): Wod {
  return {
    wod_id: 'wod-1',
    coach_id: null,
    title: 'Fuerza + metcon',
    description: null,
    start_time: '2026-11-17T22:00:00.000Z',
    end_time: '2026-11-17T23:00:00.000Z',
    max_capacity: 12,
    confirmed_count: 7,
    available_slots: 5,
    waitlist_count: 0,
    created_at: '2026-11-16T12:00:00.000Z',
    ...overrides,
  }
}

describe('class-view', () => {
  it('getSlotBadge usa texto para el estado del cupo', () => {
    expect(getSlotBadge(0)).toBe('Lista de espera')
    expect(getSlotBadge(5)).toBe('Libre')
  })

  it('toClassView deriva hora, día, duración y badge desde la API', () => {
    const view = toClassView(wod(), now)
    expect(view.timeLabel).toBe('19:00')
    expect(view.dayKey).toBe('2026-11-17')
    expect(view.dayLabel).toBe('Hoy')
    expect(view.durationMinutes).toBe(60)
    expect(view.slotBadge).toBe('Libre')
    expect(view.isStarted).toBe(false)
  })

  it('ordena por hora, agrupa por día y filtra por día y franja', () => {
    const classes = [
      toClassView(wod({ wod_id: 'wod-late', start_time: '2026-11-18T23:00:00.000Z', end_time: '2026-11-19T00:00:00.000Z' }), now),
      toClassView(wod(), now),
    ]

    expect(getSlotTimes(classes)).toEqual(['19:00', '20:00'])
    expect(groupClassesByDay(classes).map((group) => group.dayKey)).toEqual([
      '2026-11-17',
      '2026-11-18',
    ])
    expect(
      filterClasses(classes, { dayKey: '2026-11-17', time: '19:00' }).map(
        (item) => item.wod_id,
      ),
    ).toEqual(['wod-1'])
  })

  it('selecciona Hoy, 19:00 por defecto cuando existe', () => {
    const classes = [
      toClassView(wod({ wod_id: 'otro', start_time: '2026-11-18T21:00:00.000Z', end_time: '2026-11-18T22:00:00.000Z' }), now),
      toClassView(wod(), now),
    ]
    expect(getDefaultSelection(classes, '2026-11-17')).toEqual({
      dayKey: '2026-11-17',
      time: '19:00',
    })
  })

  it('resuelve el rango por defecto en ISO UTC con Z', () => {
    const range = resolveClassRange(undefined, undefined, now)
    expect(range.today).toBe('2026-11-17')
    expect(range.from).toBe('2026-11-17T03:00:00.000Z')
    expect(range.to).toBe('2026-11-24T03:00:00.000Z')
  })
})
