'use client'

import { RuntimeErrorPanel } from '@/components/ui/runtime-error-panel'

export default function AppError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return (
    <RuntimeErrorPanel
      error={error}
      title="No pudimos cargar tu espacio"
      retry={retry}
    />
  )
}
