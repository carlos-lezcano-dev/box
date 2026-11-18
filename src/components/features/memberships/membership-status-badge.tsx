import { getMembershipLabel } from '@/lib/membership-display'
import type { MembershipStatus } from '@/types/api'

/**
 * Badge de la vista de atleta. Reutiliza el catálogo compartido para los
 * estados no vigentes y aplica el copy del diseño («Al día») para ACTIVE.
 */
const LABELS: Record<MembershipStatus, string> = {
  ACTIVE: 'Al día',
  EXPIRED: getMembershipLabel('EXPIRED'),
  FROZEN: getMembershipLabel('FROZEN'),
  CANCELLED: getMembershipLabel('CANCELLED'),
}

/** Tonos con contraste AA sobre superficies claras. */
const TONES: Record<MembershipStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  FROZEN: 'border-sky-200 bg-sky-50 text-sky-800',
  EXPIRED: 'border-amber-200 bg-amber-50 text-amber-800',
  CANCELLED: 'border-zinc-200 bg-zinc-100 text-zinc-700',
}

export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${TONES[status]}`}
    >
      {LABELS[status]}
    </span>
  )
}
