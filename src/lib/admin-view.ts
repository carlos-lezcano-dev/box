import {
  formatCalendarDate,
  formatCreatedAt,
  formatDayHeader,
  formatEventDate,
  formatTime,
} from '@/lib/datetime'
import { getRoleLabel } from '@/lib/display'
import {
  formatAmount,
  getMembershipLabel,
  MEMBERSHIP_LABELS,
  STATUS_TRANSITIONS,
  canChangeStatus,
} from '@/lib/membership-display'
import type { Membership, Wod, WodRoster } from '@/types/api'

export {
  canChangeStatus,
  formatAmount,
  getMembershipLabel,
  getMembershipLabel as getStatusLabel,
  getRoleLabel,
  MEMBERSHIP_LABELS,
  STATUS_TRANSITIONS,
}

/** Resultado paginado mínimo del que se lee `meta.total`. */
type TotalCarrier = { meta?: { total: number } | undefined }

export type UserMetricsData = {
  todos: number
  atletas: number
  entrenadores: number
  administradores: number
}

/** Métricas de usuarios: cuatro consultas `limit=1`, una por rol. */
export function getUserMetrics(
  all: TotalCarrier,
  athletes: TotalCarrier,
  coaches: TotalCarrier,
  admins: TotalCarrier,
): UserMetricsData {
  return {
    todos: all.meta?.total ?? 0,
    atletas: athletes.meta?.total ?? 0,
    entrenadores: coaches.meta?.total ?? 0,
    administradores: admins.meta?.total ?? 0,
  }
}

/** Etiqueta «Alta»: delega en el helper de F6 para no duplicar zona horaria. */
export function getCreatedAtLabel(iso: string, now = new Date()): string {
  return formatCreatedAt(iso, now)
}

export function getInitials(fullName: string): string {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return '?'
  return tokens
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase() ?? '')
    .join('')
}

export function getCapacityLabel(confirmed: number, capacity: number): string {
  return `AFORO ${confirmed}/${capacity}`
}

export type AdminWodView = Wod & {
  coachLabel: string
  dayHeader: string
  timeLabel: string
}

export function toWodView(wod: Wod, coachNames: Map<string, string>): AdminWodView {
  return {
    ...wod,
    coachLabel: wod.coach_id
      ? (coachNames.get(wod.coach_id) ?? 'Entrenador')
      : 'Sin asignar',
    dayHeader: formatDayHeader(wod.start_time),
    timeLabel: formatTime(wod.start_time),
  }
}

export function toRosterView(roster: WodRoster) {
  return {
    ...roster,
    waitlist: [...roster.waitlist].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  }
}

export function toMembershipView(membership: Membership) {
  return {
    ...membership,
    statusLabel: MEMBERSHIP_LABELS[membership.status],
    amountLabel: formatAmount(membership.amount_paid),
    startDateLabel: formatCalendarDate(membership.start_date),
    endDateLabel: formatCalendarDate(membership.end_date),
    createdLabel: formatCreatedAt(membership.created_at),
  }
}

export function describeEvent(wod: Wod): string {
  return formatEventDate(wod.start_time, wod.end_time)
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID()
}
