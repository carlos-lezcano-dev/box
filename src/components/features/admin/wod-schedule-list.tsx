'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TypeFilter } from '@/components/features/admin/type-filter'
import { getCapacityLabel } from '@/lib/admin-view'
import type { AdminWodView } from '@/lib/admin-view'

export function WodScheduleList({ wods }: { wods: AdminWodView[] }) {
  const [type, setType] = useState('todos')
  const options = Array.from(
    new Set(wods.map((wod) => wod.title.trim().split(/\s+/)[0]?.toUpperCase() ?? '')),
  ).filter(Boolean)

  const visible =
    type === 'todos'
      ? wods
      : wods.filter((wod) => wod.title.trim().toUpperCase().startsWith(type))

  const grouped = visible.reduce<Record<string, AdminWodView[]>>((acc, wod) => {
    ;(acc[wod.dayHeader] ??= []).push(wod)
    return acc
  }, {})

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{visible.length} turnos en este rango</p>
        <TypeFilter options={options} value={type} onChange={setType} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-surface p-10 text-center text-sm text-muted">
          No hay turnos en este rango.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {day}
              </h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {items.map((wod) => (
                  <Link
                    key={wod.wod_id}
                    href={`/admin/schedule/${wod.wod_id}`}
                    className="rounded-xl border bg-surface p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{wod.title}</p>
                        <p className="mt-1 text-sm text-muted">{wod.coachLabel}</p>
                      </div>
                      <span className="text-lg font-semibold">{wod.timeLabel}</span>
                    </div>
                    <div className="mt-5 flex items-center justify-between text-xs text-muted">
                      <span>{getCapacityLabel(wod.confirmed_count, wod.max_capacity)}</span>
                      <span>{wod.waitlist_count} en espera</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
