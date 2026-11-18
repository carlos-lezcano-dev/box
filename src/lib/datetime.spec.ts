import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  boxToday,
  formatDayLabel,
  formatSlotTime,
  toUtcIso,
} from '@/lib/datetime'

describe('datetime (zona del box)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 12:00 del 17/11/2026 en America/Asuncion (UTC-3).
    vi.setSystemTime(new Date('2026-11-17T15:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('boxToday devuelve la fecha del box con el reloj fijo', () => {
    expect(boxToday()).toBe('2026-11-17')
  })

  it('toUtcIso convierte 19:00 del box a ISO UTC', () => {
    expect(toUtcIso('2026-11-17', '19:00')).toBe('2026-11-17T22:00:00.000Z')
  })

  it('formatSlotTime muestra la hora local del box', () => {
    expect(formatSlotTime('2026-11-17T22:00:00Z')).toBe('19:00')
  })

  it('formatDayLabel distingue Hoy, Mañana y día abreviado', () => {
    expect(formatDayLabel('2026-11-17T22:00:00Z')).toBe('Hoy')
    expect(formatDayLabel('2026-11-18T22:00:00Z')).toBe('Mañana')
    expect(formatDayLabel('2026-11-20T22:00:00Z')).toBe('vie')
  })
})
