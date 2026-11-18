'use client'

import { useRouter } from 'next/navigation'

export function BookingsError({
  code,
  message,
  requestId,
}: {
  code: string
  message: string
  requestId?: string
}) {
  const router = useRouter()

  return (
    <div role="alert" className="rounded-2xl border bg-surface p-6">
      <h2 className="text-lg font-semibold">No pudimos cargar tus reservas</h2>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <p className="mt-1 font-mono text-xs text-muted">
        {code}
        {requestId ? ` · ${requestId}` : ''}
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
      >
        Reintentar
      </button>
    </div>
  )
}
