/** Chip del plan vigente; se oculta cuando no hay membresía activa. */
export function MembershipChip({ planName }: { planName: string | null }) {
  if (!planName) return null
  return (
    <span
      data-testid="membership-chip"
      className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 md:inline"
    >
      {planName}
    </span>
  )
}
