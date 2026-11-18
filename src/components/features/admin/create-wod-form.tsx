'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createWodAction } from '@/actions/admin'
import { Modal } from '@/components/ui/modal'
import { zonedDateTimeToIso } from '@/lib/datetime'

export function CreateWodForm({
  open,
  onClose,
  coaches,
  defaultDate,
}: {
  open: boolean
  onClose: () => void
  coaches: Array<{ user_id: string; full_name: string }>
  defaultDate: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date') ?? '')
    const startTime = String(form.get('start_time') ?? '')
    const endTime = String(form.get('end_time') ?? '')
    const coachId = String(form.get('coach_id') ?? '')

    setPending(true)
    setError(null)
    setFields({})

    const result = await createWodAction({
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') || '') || undefined,
      start_time: zonedDateTimeToIso(date, startTime),
      end_time: zonedDateTimeToIso(date, endTime),
      max_capacity: Number(form.get('max_capacity') ?? 15),
      ...(coachId ? { coach_id: coachId } : {}),
    })

    setPending(false)
    if (!result.ok) {
      setError(result.message ?? 'No se pudo crear el turno.')
      setFields(result.fields ?? {})
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <Modal open={open} title="Crear turno" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input label="Título" name="title" error={fields.title} required placeholder="WOD" />
        <label className="block text-sm font-medium">
          Descripción
          <textarea
            name="description"
            rows={3}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Fecha" name="date" type="date" defaultValue={defaultDate} required />
          <Input label="Inicio" name="start_time" type="time" defaultValue="18:00" required />
          <Input label="Fin" name="end_time" type="time" defaultValue="19:00" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Aforo"
            name="max_capacity"
            type="number"
            defaultValue={15}
            min={1}
            max={100}
            error={fields.max_capacity}
            required
          />
          <label className="block text-sm font-medium">
            Entrenador
            <select name="coach_id" className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm">
              <option value="">Sin asignar</option>
              {coaches.map((coach) => (
                <option key={coach.user_id} value={coach.user_id}>
                  {coach.full_name}
                </option>
              ))}
            </select>
            {fields.coach_id && <span className="mt-1 block text-xs text-red-700">{fields.coach_id}</span>}
          </label>
        </div>

        {(error || fields.start_time || fields.end_time) && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
            {fields.start_time ? ` ${fields.start_time}` : ''}
            {fields.end_time ? ` ${fields.end_time}` : ''}
          </p>
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
            {pending ? 'Guardando…' : 'Crear turno'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Input({
  label,
  name,
  error,
  type = 'text',
  ...rest
}: {
  label: string
  name: string
  error?: string
  type?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        aria-invalid={Boolean(error)}
        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  )
}
