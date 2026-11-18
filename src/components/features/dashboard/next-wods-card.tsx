import Link from 'next/link'
import type { PanelWodView } from '@/lib/dashboard-view'
import { getErrorMessage } from '@/lib/errors'

export type NextWodsState = 'success' | 'loading' | 'empty' | 'error'

type NextWodsCardProps = {
  /** Ya ordenados y con la hora formateada por `toPanelGeneralView` (formatTime). */
  wods: PanelWodView[]
  state?: NextWodsState
  message?: string
  code?: string
}

export function NextWodsCard({
  wods,
  state = 'success',
  message,
  code,
}: NextWodsCardProps) {
  const items = wods.slice(0, 5)
  const effectiveState = state === 'success' && items.length === 0 ? 'empty' : state

  return (
    <section
      aria-label="Próximos turnos"
      data-testid="next-wods-card"
      className="mt-6 rounded-xl border bg-surface p-5 shadow-sm"
    >
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Próximos turnos</h2>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
          Zona del box
        </p>
      </div>

      {effectiveState === 'loading' && (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="sr-only">Cargando próximos turnos</span>
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-12 animate-pulse rounded-lg bg-brand-soft" />
          ))}
        </div>
      )}

      {effectiveState === 'error' && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">
            {getErrorMessage(code ?? 'INTERNAL_ERROR', message)}
          </p>
          {code && <p className="mt-1 font-mono text-xs text-red-800">{code}</p>}
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-red-900 underline">
            Reintentar
          </Link>
        </div>
      )}

      {effectiveState === 'empty' && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-zinc-700">
          No hay turnos próximos para mostrar.
        </p>
      )}

      {effectiveState === 'success' && (
        <ol className="divide-y">
          {items.map((wod) => (
            <li key={wod.wod_id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-4">
                <span className="w-14 text-lg font-semibold tabular-nums text-foreground">
                  {wod.timeLabel}
                </span>
                <span className="text-sm font-medium text-foreground">{wod.title}</span>
              </div>
              <span className="shrink-0 text-xs font-medium text-zinc-700">
                {wod.availableSlots > 0
                  ? `${wod.availableSlots} lugares libres`
                  : 'Sin lugares libres'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
