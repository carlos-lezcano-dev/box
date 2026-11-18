import Link from 'next/link'
import { BookButton } from '@/components/features/classes/book-button'
import { getSlotDescription } from '@/lib/class-view'
import type { ClassView } from '@/lib/class-view'
import type { BookingNotice } from '@/hooks/use-book-action'

export function ClassCard({
  wod,
  hasActiveMembership,
  onNotice,
}: {
  wod: ClassView
  hasActiveMembership: boolean
  onNotice: (notice: BookingNotice) => void
}) {
  const statusId = `slot-status-${wod.wod_id}`
  const membershipId = `membership-notice-${wod.wod_id}`
  const titleId = `class-title-${wod.wod_id}`
  const isWaitlist = wod.available_slots === 0

  return (
    <article
      aria-labelledby={titleId}
      data-testid="class-card"
      className="flex min-w-0 flex-col rounded-xl border bg-surface p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            WOD
          </p>
          <h3 id={titleId} className="mt-1 truncate font-semibold">
            {wod.title}
          </h3>
          {wod.coach_full_name && (
            <p className="mt-1 truncate text-sm text-muted">{wod.coach_full_name}</p>
          )}
        </div>
        <span
          data-testid="slot-badge"
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
            isWaitlist
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
        >
          {wod.slotBadge}
        </span>
      </div>

      <p className="mt-4 text-2xl font-semibold tabular-nums">{wod.timeLabel}</p>
      <p className="text-xs text-muted">
        {wod.durationMinutes} min · {wod.dayLabel}
      </p>
      {wod.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted">{wod.description}</p>
      )}

      <p id={statusId} className="mt-4 text-sm font-medium">
        {getSlotDescription(wod)}
      </p>

      {!hasActiveMembership && (
        <p id={membershipId} role="alert" className="mt-2 text-xs text-amber-800">
          Se requiere una membresía activa.{' '}
          <Link href="/memberships" className="font-semibold underline">
            Ver membresías
          </Link>
        </p>
      )}

      <BookButton
        wodId={wod.wod_id}
        availableSlots={wod.available_slots}
        isStarted={wod.isStarted}
        hasActiveMembership={hasActiveMembership}
        statusId={statusId}
        describedBy={hasActiveMembership ? undefined : membershipId}
        onResult={onNotice}
      />
    </article>
  )
}
