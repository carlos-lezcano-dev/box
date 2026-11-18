'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import type { ActionResult } from '@/types/api'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  onCancel,
  onConfirm,
  onSuccessNotice,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onCancel: () => void
  onConfirm: () => Promise<ActionResult>
  onSuccessNotice?: (message: string) => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setPending(true)
    setError(null)
    const result = await onConfirm()
    setPending(false)
    if (!result.ok) {
      setError(result.message ?? 'No se pudo completar la acción.')
      return
    }
    if (result.message) onSuccessNotice?.(result.message)
    onCancel()
  }

  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <p className="text-sm leading-6 text-muted">{description}</p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2.5 text-sm"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Procesando…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
