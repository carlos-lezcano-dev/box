import { getBoxToday } from '@/lib/datetime'
import {
  formatCurrency,
  getMembershipLabel,
} from '@/lib/membership-display'
import type { Membership, MembershipStatus } from '@/types/api'

export { formatCurrency, getMembershipLabel as getStatusLabel }

export type MembershipView = {
  membership_id: string
  plan_name: string
  amount_paid: number
  amountLabel: string
  start_date: string
  end_date: string
  status: MembershipStatus
  statusLabel: string
  daysRemaining: number
  validityLabel: string
  nearExpiration: boolean
  isActive: boolean
}

function diffDays(endDate: string, today: string): number {
  const end = Date.parse(`${endDate}T00:00:00Z`)
  const start = Date.parse(`${today}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}

/** Días restantes con `end_date` inclusivo. */
export function getDaysRemaining(endDate: string, today = getBoxToday()): number {
  return Math.max(0, diffDays(endDate, today))
}

export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

export function getValidityLabel(
  endDate: string,
  today = getBoxToday(),
): string {
  const days = getDaysRemaining(endDate, today)
  if (days === 0) return 'Vigente hasta hoy'
  return `Vigente hasta el ${formatShortDate(endDate)}`
}

/** ACTIVE con vencimiento más próximo; si no hay activas, la más reciente. */
export function pickCurrent<T extends Membership>(memberships: T[]): T | null {
  if (memberships.length === 0) return null
  const byNearestEnd = (a: T, b: T) => a.end_date.localeCompare(b.end_date)
  const active = memberships.filter((item) => item.status === 'ACTIVE')
  if (active.length > 0) return [...active].sort(byNearestEnd)[0] ?? null
  return [...memberships].sort((a, b) => b.end_date.localeCompare(a.end_date))[0] ?? null
}

export function toMembershipView(
  membership: Membership,
  today = getBoxToday(),
): MembershipView {
  const daysRemaining = getDaysRemaining(membership.end_date, today)
  return {
    membership_id: membership.membership_id,
    plan_name: membership.plan_name,
    amount_paid: membership.amount_paid,
    amountLabel: formatCurrency(membership.amount_paid),
    start_date: membership.start_date,
    end_date: membership.end_date,
    status: membership.status,
    statusLabel: getMembershipLabel(membership.status),
    daysRemaining,
    validityLabel: getValidityLabel(membership.end_date, today),
    nearExpiration: membership.status === 'ACTIVE' && daysRemaining <= 7,
    isActive: membership.status === 'ACTIVE',
  }
}

/** Props serializables para el chip del encabezado. */
export function getHeaderMembership(
  memberships: Membership[],
): { planName: string; hasActiveMembership: boolean } | null {
  const current = pickCurrent(memberships)
  if (!current) return null
  return {
    planName: current.status === 'ACTIVE' ? current.plan_name : '',
    hasActiveMembership: current.status === 'ACTIVE',
  }
}
