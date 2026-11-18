'use client'

import {
  getDayButtonLabel,
  getMonthLabel,
  getSlotTimes,
  groupClassesByDay,
} from '@/lib/class-view'
import type { ClassSelection, ClassView } from '@/lib/class-view'

const buttonClass = (active: boolean) =>
  `shrink-0 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
    active
      ? 'border-brand bg-brand text-white'
      : 'bg-surface text-foreground hover:bg-brand-soft'
  }`

/** Selector de día y franja horaria; opciones derivadas de los turnos reales. */
export function ClassDateFilter({
  classes,
  selection,
  onChange,
  todayKey,
}: {
  classes: ClassView[]
  selection: ClassSelection
  onChange: (selection: ClassSelection) => void
  todayKey: string
}) {
  const days = groupClassesByDay(classes)
  const times = getSlotTimes(classes)
  const monthLabel = getMonthLabel(selection.dayKey ?? days[0]?.dayKey ?? todayKey)

  return (
    <section aria-label="Filtrar agenda" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{monthLabel}</h2>
        <p className="text-xs text-muted">Elegí un día y una franja horaria.</p>
      </div>

      <div
        role="group"
        aria-label="Elegir día"
        className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible"
      >
        {days.map((day) => (
          <button
            key={day.dayKey}
            type="button"
            aria-pressed={selection.dayKey === day.dayKey}
            onClick={() => onChange({ ...selection, dayKey: day.dayKey })}
            className={buttonClass(selection.dayKey === day.dayKey)}
          >
            {getDayButtonLabel(day, todayKey)}
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label="Elegir horario"
        className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible"
      >
        {times.map((time) => {
          const active = selection.time === time
          const isToday = selection.dayKey === todayKey
          return (
            <button
              key={time}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...selection, time })}
              className={buttonClass(active)}
            >
              {active && isToday ? `Hoy, ${time}` : time}
            </button>
          )
        })}
      </div>
    </section>
  )
}
