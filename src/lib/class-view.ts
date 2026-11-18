import {
  BOX_TIME_ZONE,
  formatDayLabel,
  formatSlotTime,
  getBoxToday,
  toUtcIso,
} from '@/lib/datetime'
import type { Wod } from '@/types/api'

export type SlotBadge = 'Libre' | 'Lista de espera'

/** Franajas del diseño; se renderizan sólo cuando existen turnos en ellas. */
export const DESIGN_SLOT_TIMES: readonly string[] = [
  '12:30',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
]

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export type ClassView = {
  wod_id: string
  coach_id: string | null
  /** El backend no envía este campo; se completa sólo si hay resolución opcional. */
  coach_full_name: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string
  max_capacity: number
  confirmed_count: number
  available_slots: number
  waitlist_count: number
  dayKey: string
  dayLabel: string
  dayNumber: string
  monthLabel: string
  timeLabel: string
  durationMinutes: number
  slotBadge: SlotBadge
  isStarted: boolean
}

export type ClassSelection = {
  dayKey: string | null
  time: string | null
}

export type ClassDayGroup = {
  dayKey: string
  dayLabel: string
  dayNumber: string
  monthLabel: string
  classes: ClassView[]
}

export type ClassRange = {
  /** ISO UTC con Z, listo para `GET /wods?from=`. */
  from: string
  /** ISO UTC con Z, extremo exclusivo. */
  to: string
  /** Fecha wall-clock del box (`YYYY-MM-DD`). */
  today: string
}

/** Etiqueta textual del cupo: nunca se apoya sólo en color. */
export function getSlotBadge(availableSlots: number): SlotBadge {
  return availableSlots === 0 ? 'Lista de espera' : 'Libre'
}

export function getSlotDescription(wod: ClassView): string {
  if (wod.available_slots === 0) {
    return `Lista de espera · ${wod.waitlist_count} en espera`
  }
  return `${wod.available_slots} cupos disponibles de ${wod.max_capacity}`
}

/** Día del box en `YYYY-MM-DD`, sin depender del `toISOString()` del navegador. */
export function getDayKey(iso: string, timeZone = BOX_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00'
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function addDays(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00Z`)
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  )
}

export function getMonthLabel(dayKey: string): string {
  const month = Number(dayKey.slice(5, 7))
  return `${MONTHS[month - 1] ?? ''} ${dayKey.slice(0, 4)}`.trim()
}

function normalizeDateParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  if (trimmed.includes('T')) {
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  }
  return null
}

/** Rango por defecto: hoy → hoy + 7 días, siempre en ISO UTC con Z. */
export function resolveClassRange(
  from?: string | string[],
  to?: string | string[],
  now = new Date(),
): ClassRange {
  const today = getBoxToday(now)
  const startDate = normalizeDateParam(from) ?? today
  let endDate = normalizeDateParam(to) ?? addDays(startDate, 7)
  if (endDate < startDate) endDate = startDate
  if (daysBetween(startDate, endDate) > 31) endDate = addDays(startDate, 31)
  return {
    from: toUtcIso(startDate, '00:00'),
    to: toUtcIso(endDate, '00:00'),
    today,
  }
}

export function toClassView(
  wod: Wod,
  now = new Date(),
  coachNames?: Record<string, string>,
): ClassView {
  const dayKey = getDayKey(wod.start_time)
  const extra = wod as Wod & { coach_full_name?: string | null }
  const coachName = coachNames?.[wod.coach_id ?? ''] ?? extra.coach_full_name ?? null
  return {
    wod_id: wod.wod_id,
    coach_id: wod.coach_id,
    coach_full_name: coachName,
    title: wod.title,
    description: wod.description,
    start_time: wod.start_time,
    end_time: wod.end_time,
    max_capacity: wod.max_capacity,
    confirmed_count: wod.confirmed_count,
    available_slots: wod.available_slots,
    waitlist_count: wod.waitlist_count,
    dayKey,
    dayLabel: formatDayLabel(wod.start_time, now),
    dayNumber: dayKey.slice(8),
    monthLabel: getMonthLabel(dayKey),
    timeLabel: formatSlotTime(wod.start_time),
    durationMinutes: Math.round(
      (Date.parse(wod.end_time) - Date.parse(wod.start_time)) / 60_000,
    ),
    slotBadge: getSlotBadge(wod.available_slots),
    isStarted: Date.parse(wod.start_time) <= now.getTime(),
  }
}

export function sortClassesByTime(classes: ClassView[]): ClassView[] {
  return [...classes].sort((a, b) => a.start_time.localeCompare(b.start_time))
}

export function groupClassesByDay(classes: ClassView[]): ClassDayGroup[] {
  const groups = new Map<string, ClassDayGroup>()
  for (const item of sortClassesByTime(classes)) {
    let group = groups.get(item.dayKey)
    if (!group) {
      group = {
        dayKey: item.dayKey,
        dayLabel: item.dayLabel,
        dayNumber: item.dayNumber,
        monthLabel: item.monthLabel,
        classes: [],
      }
      groups.set(item.dayKey, group)
    }
    group.classes.push(item)
  }
  return [...groups.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey))
}

/** Horarios del diseño presentes en los datos; otros horarios se agregan al final. */
export function getSlotTimes(classes: ClassView[]): string[] {
  const present = new Set(classes.map((item) => item.timeLabel))
  const known = DESIGN_SLOT_TIMES.filter((time) => present.has(time))
  const extra = [...present].filter((time) => !known.includes(time)).sort()
  return [...known, ...extra]
}

export function filterClasses(
  classes: ClassView[],
  selection: ClassSelection,
): ClassView[] {
  return sortClassesByTime(
    classes.filter(
      (item) =>
        (selection.dayKey === null || item.dayKey === selection.dayKey) &&
        (selection.time === null || item.timeLabel === selection.time),
    ),
  )
}

/** «Hoy, 19:00» cuando existe; si no, el primer turno disponible. */
export function getDefaultSelection(
  classes: ClassView[],
  todayKey: string,
): ClassSelection {
  const ordered = sortClassesByTime(classes)
  const todayAtDefault = ordered.find(
    (item) => item.dayKey === todayKey && item.timeLabel === '19:00',
  )
  const first = todayAtDefault ?? ordered[0]
  return first
    ? { dayKey: first.dayKey, time: first.timeLabel }
    : { dayKey: todayKey, time: '19:00' }
}

export function getDayButtonLabel(
  day: Pick<ClassDayGroup, 'dayKey' | 'dayNumber'>,
  todayKey: string,
): string {
  if (day.dayKey === todayKey) return `Hoy, ${day.dayNumber}`
  if (day.dayKey === addDays(todayKey, 1)) return `Mañana, ${day.dayNumber}`
  return day.dayNumber
}
