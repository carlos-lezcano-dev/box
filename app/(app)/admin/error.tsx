'use client'

import { RuntimeErrorPanel } from '@/components/ui/runtime-error-panel'

export default function AdminError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return (
    <RuntimeErrorPanel
      error={error}
      title="No pudimos cargar administración"
      retry={retry}
    />
  )
}
