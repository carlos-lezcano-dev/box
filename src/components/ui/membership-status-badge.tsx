import { getMembershipLabel } from '@/lib/membership-display'
import type { MembershipStatus } from '@/types/api'

const TONES: Record<MembershipStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  FROZEN: 'border-sky-200 bg-sky-50 text-sky-800',
  EXPIRED: 'border-amber-200 bg-amber-50 text-amber-800',
  CANCELLED: 'border-zinc-200 bg-zinc-100 text-zinc-700',
}

/** Badge compartido entre F4 y F7. */
export function MembershipStatusBadge({ status }: { status: MembershipStatus }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${TONES[status]}`}>
      {getMembershipLabel(status)}
    </span>
  )
}
