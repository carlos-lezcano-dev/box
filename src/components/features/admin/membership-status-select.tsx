'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { updateMembershipStatusAction } from '@/actions/admin'
import { MembershipStatusBadge } from '@/components/ui/membership-status-badge'
import { getMembershipLabel, STATUS_TRANSITIONS } from '@/lib/membership-display'
import type { MembershipStatus } from '@/types/api'

export function MembershipStatusSelect({
  membershipId,
  status,
}: {
  membershipId: string
  status: MembershipStatus
}) {
  const router = useRouter()
  const [value, setValue] = useState<MembershipStatus>(status)
  const [error, setError] = useState<string | null>(null)
  const options = STATUS_TRANSITIONS[status]

  if (options.length === 0) {
    return <MembershipStatusBadge status={status} />
  }

  async function handleChange(next: MembershipStatus) {
    const previous = value
    setValue(next)
    setError(null)
    const result = await updateMembershipStatusAction(
      membershipId,
      next as 'ACTIVE' | 'FROZEN' | 'CANCELLED',
    )
    if (!result.ok) {
      setValue(previous)
      setError(result.message ?? 'No se pudo cambiar el estado.')
      return
    }
    router.refresh()
  }

  return (
    <div>
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value as MembershipStatus)}
        aria-label="Cambiar estado de la membresía"
        className="rounded-lg border bg-white px-2 py-1.5 text-xs"
      >
        <option value={value}>{getMembershipLabel(value)}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {getMembershipLabel(option)}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 max-w-48 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
