'use client'

import { useMemo, useState } from 'react'
import { ClassCard } from '@/components/features/classes/class-card'
import { ClassDateFilter } from '@/components/features/classes/class-date-filter'
import { BookingToast } from '@/components/features/classes/booking-toast'
import {
  filterClasses,
  getDefaultSelection,
  groupClassesByDay,
} from '@/lib/class-view'
import type { ClassSelection, ClassView } from '@/lib/class-view'
import type { BookingNotice } from '@/hooks/use-book-action'

export function ClassList({
  classes,
  hasActiveMembership,
  todayKey,
}: {
  classes: ClassView[]
  hasActiveMembership: boolean
  todayKey: string
}) {
  const [selection, setSelection] = useState<ClassSelection>(() =>
    getDefaultSelection(classes, todayKey),
  )
  const [toast, setToast] = useState<BookingNotice | null>(null)

  const visible = useMemo(() => filterClasses(classes, selection), [classes, selection])
  const groups = useMemo(() => groupClassesByDay(visible), [visible])

  return (
    <div className="space-y-6">
      <ClassDateFilter
        classes={classes}
        selection={selection}
        onChange={setSelection}
        todayKey={todayKey}
      />

      <BookingToast notice={toast} onDismiss={() => setToast(null)} />

      {visible.length === 0 ? (
        <div
          role="status"
          className="rounded-xl border border-dashed bg-surface p-10 text-center text-sm text-muted"
        >
          No hay turnos para el día y horario elegidos.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.dayKey} aria-labelledby={`day-${group.dayKey}`}>
              <h2
                id={`day-${group.dayKey}`}
                className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted"
              >
                {group.dayLabel} · {group.monthLabel}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.classes.map((wod) => (
                  <ClassCard
                    key={wod.wod_id}
                    wod={wod}
                    hasActiveMembership={hasActiveMembership}
                    onNotice={setToast}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
