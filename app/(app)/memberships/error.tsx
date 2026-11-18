'use client'

import { RuntimeErrorPanel } from '@/components/ui/runtime-error-panel'

export default function MembershipsError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  return (
    <RuntimeErrorPanel
      error={error}
      title="No pudimos cargar tus membresías"
      retry={retry}
    />
  )
}
