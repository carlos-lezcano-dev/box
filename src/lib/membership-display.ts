import type { MembershipStatus } from '@/types/api'

/**
 * Helpers compartidos de membresías. F4 y F7 consumen este módulo; ninguna
 * feature debe copiar el formateo ni el catálogo de estados.
 */
export const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: 'Activa',
  EXPIRED: 'Vencida',
  FROZEN: 'Congelada',
  CANCELLED: 'Cancelada',
}

export const STATUS_TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
  ACTIVE: ['FROZEN', 'CANCELLED'],
  FROZEN: ['ACTIVE', 'CANCELLED'],
  EXPIRED: [],
  CANCELLED: [],
}

export function getMembershipLabel(status: MembershipStatus): string {
  return MEMBERSHIP_LABELS[status]
}

export function canChangeStatus(from: MembershipStatus, to: MembershipStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to)
}

/** Formato PYG del diseño: `$6.240.000` (el locale es-PY usa `Gs.` por defecto). */
export function formatCurrency(amount: number): string {
  return `$${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(amount)}`
}

export const formatAmount = formatCurrency
