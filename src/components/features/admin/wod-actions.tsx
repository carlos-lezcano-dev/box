'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cancelWodAction, updateWodAction } from '@/actions/admin'
import { ConfirmDialog } from '@/components/features/admin/confirm-dialog'
import { Modal } from '@/components/ui/modal'
import { zonedDateTimeToIso } from '@/lib/datetime'
import type { Wod } from '@/types/api'

export function WodActions({
  wod,
  coaches,
}: {
  wod: Wod
  coaches: Array<{ user_id: string; full_name: string }>
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const date = wod.start_time.slice(0, 10)
  const startTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Asuncion',
  }).format(new Date(wod.start_time))
  const endTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Asuncion',
  }).format(new Date(wod.end_time))

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const newDate = String(form.get('date') ?? date)
    const newStart = String(form.get('start_time') ?? startTime)
    const newEnd = String(form.get('end_time') ?? endTime)
    const coachId = String(form.get('coach_id') ?? '')

    setPending(true)
    setError(null)
    const result = await updateWodAction(wod.wod_id, {
      title: String(form.get('title') ?? ''),
      description: String(form.get('description') || '') || undefined,
      start_time: zonedDateTimeToIso(newDate, newStart),
      end_time: zonedDateTimeToIso(newDate, newEnd),
      max_capacity: Number(form.get('max_capacity') ?? wod.max_capacity),
      coach_id: coachId || null,
    })
    setPending(false)
    if (!result.ok) {
      setError(result.message ?? 'No se pudo actualizar el turno.')
      return
    }
    setEditing(false)
    router.refresh()
  }

  return (
    <>
      {notice && (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border px-4 py-2.5 text-sm"
        >
          Editar turno
        </button>
        <button
          type="button"
          onClick={() => setCancelling(true)}
          className="rounded-lg border border-red-300 px-4 py-2.5 text-sm text-red-700"
        >
          Cancelar turno
        </button>
      </div>

      <Modal open={editing} title="Editar turno" onClose={() => setEditing(false)}>
        <form className="space-y-4" onSubmit={handleEdit}>
          <LabeledInput name="title" label="Título" defaultValue={wod.title} required />
          <label className="block text-sm font-medium">
            Descripción
            <textarea
              name="description"
              rows={3}
              defaultValue={wod.description ?? ''}
              className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <LabeledInput name="date" label="Fecha" type="date" defaultValue={date} required />
            <LabeledInput name="start_time" label="Inicio" type="time" defaultValue={startTime} required />
            <LabeledInput name="end_time" label="Fin" type="time" defaultValue={endTime} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              name="max_capacity"
              label="Aforo"
              type="number"
              min={1}
              max={100}
              defaultValue={wod.max_capacity}
              required
            />
            <label className="block text-sm font-medium">
              Entrenador
              <select
                name="coach_id"
                defaultValue={wod.coach_id ?? ''}
                className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"
              >
                <option value="">Sin asignar</option>
                {coaches.map((coach) => (
                  <option key={coach.user_id} value={coach.user_id}>
                    {coach.full_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2.5 text-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={cancelling}
        title="Cancelar turno"
        description="Se cancelarán también las reservas confirmadas y la lista de espera de este turno."
        confirmLabel="Cancelar turno"
        onCancel={() => setCancelling(false)}
        onConfirm={() => cancelWodAction(wod.wod_id)}
        onSuccessNotice={setNotice}
      />
    </>
  )
}

function LabeledInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
        {...props}
      />
    </label>
  )
}
