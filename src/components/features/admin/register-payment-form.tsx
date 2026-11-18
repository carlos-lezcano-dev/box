'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createMembershipAction } from '@/actions/admin'
import { Modal } from '@/components/ui/modal'
import { newIdempotencyKey } from '@/lib/admin-view'
import type { PaymentMethod } from '@/types/api'

export function RegisterPaymentForm({
  open,
  onClose,
  users,
}: {
  open: boolean
  onClose: () => void
  users: Array<{ user_id: string; full_name: string; email: string }>
}) {
  const router = useRouter()
  const [key, setKey] = useState(() => newIdempotencyKey())
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ message: string; code?: string } | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [method, setMethod] = useState<PaymentMethod>('TRANSFER')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    setFields({})

    const result = await createMembershipAction(
      {
        user_id: String(form.get('user_id') ?? ''),
        plan_name: String(form.get('plan_name') ?? ''),
        amount_paid: Number(form.get('amount_paid') ?? 0),
        start_date: String(form.get('start_date') ?? ''),
        end_date: String(form.get('end_date') ?? ''),
        payment_method: method,
        notes: String(form.get('notes') || '') || undefined,
      },
      key,
    )

    setPending(false)
    if (!result.ok) {
      setError({ message: result.message ?? 'No se pudo registrar el pago.', code: result.code })
      setFields(result.fields ?? {})
      return
    }
    setKey(newIdempotencyKey())
    onClose()
    router.refresh()
  }

  return (
    <Modal open={open} title="Registrar pago" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          Atleta
          <select name="user_id" required className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm">
            <option value="">Seleccionar atleta</option>
            {users.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.full_name} · {user.email}
              </option>
            ))}
          </select>
          {fields.user_id && <span className="mt-1 block text-xs text-red-700">{fields.user_id}</span>}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Plan" name="plan_name" error={fields.plan_name} required placeholder="Mensual" />
          <Input
            label="Importe"
            name="amount_paid"
            type="number"
            step="0.01"
            min="0.01"
            max="1000000"
            error={fields.amount_paid}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Desde" name="start_date" type="date" error={fields.start_date} required />
          <Input label="Hasta" name="end_date" type="date" error={fields.end_date} required />
        </div>
        <label className="block text-sm font-medium">
          Método de pago
          <select
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"
          >
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CREDIT_CARD">Tarjeta de crédito</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Notas
          <textarea name="notes" rows={2} className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm" />
        </label>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <p>{error.message}</p>
            {error.code === 'IDEMPOTENCY_CONFLICT' && (
              <button
                type="button"
                onClick={() => {
                  setKey(newIdempotencyKey())
                  setError(null)
                }}
                className="mt-2 underline"
              >
                Generar nueva clave y reintentar
              </button>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2.5 text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? 'Guardando…' : 'Registrar pago'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Input({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        aria-invalid={Boolean(error)}
        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  )
}
