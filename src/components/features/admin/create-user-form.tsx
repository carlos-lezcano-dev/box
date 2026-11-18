'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createUserAction } from '@/actions/admin'
import { Modal } from '@/components/ui/modal'
import type { Role } from '@/types/api'

export function CreateUserForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | undefined>()
  const [fields, setFields] = useState<Record<string, string>>({})
  const [role, setRole] = useState<Role>('ATHLETE')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    setRequestId(undefined)
    setFields({})

    const result = await createUserAction({
      full_name: String(form.get('full_name') ?? ''),
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      phone: String(form.get('phone') || '') || undefined,
      emergency_contact: String(form.get('emergency_contact') || '') || undefined,
      role,
    })

    setPending(false)
    if (!result.ok) {
      setError(result.message ?? 'No se pudo crear el usuario.')
      setRequestId(result.requestId)
      const nextFields = { ...(result.fields ?? {}) }
      // USER_EMAIL_TAKEN no trae `details`: el backend sólo expone el code.
      if (result.code === 'USER_EMAIL_TAKEN') {
        nextFields.email = result.message ?? 'Ya existe un usuario con ese email.'
      }
      setFields(nextFields)
      return
    }
    onClose()
    router.refresh()
  }

  return (
    <Modal open={open} title="+ Nuevo usuario" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Nombre completo" name="full_name" error={fields.full_name} required />
        <Field label="Email" name="email" type="email" error={fields.email} required />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          error={fields.password}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono" name="phone" error={fields.phone} />
          <Field label="Contacto de emergencia" name="emergency_contact" error={fields.emergency_contact} />
        </div>
        <label className="block text-sm font-medium">
          Rol
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm"
          >
            <option value="ATHLETE">Atleta</option>
            <option value="COACH">Entrenador</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
            {requestId && <span className="mt-1 block font-mono text-xs">{requestId}</span>}
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
            {pending ? 'Guardando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({
  label,
  name,
  error,
  type = 'text',
  required,
}: {
  label: string
  name: string
  error?: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        aria-invalid={Boolean(error)}
        className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
      />
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  )
}
