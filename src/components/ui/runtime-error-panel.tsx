'use client'

import { ApiError } from '@/api/client'
import { getErrorMessage } from '@/lib/errors'

/** Panel compartido por los error boundaries de la app y de /admin. */
export function RuntimeErrorPanel({
  error,
  title,
  retry,
}: {
  error: unknown
  title: string
  retry: () => void
}) {
  const apiError = error instanceof ApiError ? error : null
  const code = apiError?.code ?? 'INTERNAL_ERROR'
  const message = apiError
    ? getErrorMessage(apiError.code, apiError.message)
    : error instanceof Error
      ? error.message
      : 'Error desconocido'

  return (
    <div role="alert" className="rounded-xl border bg-surface p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <p className="mt-1 font-mono text-xs text-muted">
        {code}
        {apiError?.requestId ? ` · ${apiError.requestId}` : ''}
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
      >
        Reintentar
      </button>
    </div>
  )
}
