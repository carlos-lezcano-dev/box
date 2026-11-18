'use client'

import { useState } from 'react'
import { CreateWodForm } from '@/components/features/admin/create-wod-form'

export function CreateWodTrigger({
  coaches,
  defaultDate,
}: {
  coaches: Array<{ user_id: string; full_name: string }>
  defaultDate: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
      >
        Crear turno
      </button>
      <CreateWodForm
        open={open}
        onClose={() => setOpen(false)}
        coaches={coaches}
        defaultDate={defaultDate}
      />
    </>
  )
}
