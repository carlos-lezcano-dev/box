'use client'

import { useState } from 'react'
import { CreateUserForm } from '@/components/features/admin/create-user-form'

export function CreateUserTrigger() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
      >
        + Nuevo
      </button>
      <CreateUserForm open={open} onClose={() => setOpen(false)} />
    </>
  )
}
