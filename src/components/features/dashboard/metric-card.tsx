import { getErrorMessage } from '@/lib/errors'

export type MetricCardState = 'success' | 'loading' | 'empty' | 'error'

type MetricCardProps = {
  label: string
  value?: number | string | null
  state?: MetricCardState
  message?: string
  code?: string
  testId?: string
}

const BASE =
  'flex min-h-28 flex-col justify-between rounded-xl border bg-surface p-5 shadow-sm'

/**
 * Una tarjeta por métrica. `value === null` en estado success significa
 * «sin fuente confirmada» y no produce tarjeta; los estados explícitos
 * loading/empty/error sí se renderizan para no ocultar un fallo local.
 */
export function MetricCard({
  label,
  value = null,
  state = 'success',
  message,
  code,
  testId,
}: MetricCardProps) {
  if (state === 'success' && value === null) return null

  if (state === 'loading') {
    return (
      <section aria-label={label} data-testid={testId} className={BASE}>
        <div role="status" aria-live="polite">
          <span className="sr-only">Cargando {label}</span>
          <div className="h-8 w-20 animate-pulse rounded bg-brand-soft" />
        </div>
        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-600">
          {label}
        </p>
      </section>
    )
  }

  if (state === 'error') {
    return (
      <section
        role="alert"
        aria-label={label}
        data-testid={testId}
        className={`${BASE} border-red-200 bg-red-50`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-red-800">{label}</p>
        <p className="mt-3 text-sm font-medium text-red-900">
          {getErrorMessage(code ?? 'INTERNAL_ERROR', message)}
        </p>
        {code && <p className="mt-2 font-mono text-xs text-red-800">{code}</p>}
      </section>
    )
  }

  if (state === 'empty') {
    return (
      <section aria-label={label} data-testid={testId} className={BASE}>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">{label}</p>
        <p className="mt-3 text-sm text-zinc-700">Sin datos disponibles</p>
      </section>
    )
  }

  return (
    <section aria-label={label} data-testid={testId} className={BASE}>
      <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-600">{label}</p>
    </section>
  )
}
