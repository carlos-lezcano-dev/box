'use client'

import { useState } from 'react'
import { RegisterPaymentForm } from '@/components/features/admin/register-payment-form'

export function RegisterPaymentTrigger({
  users,
}: {
  users: Array<{ user_id: string; full_name: string; email: string }>
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
      >
        Registrar pago
      </button>
      <RegisterPaymentForm open={open} onClose={() => setOpen(false)} users={users} />
    </>
  )
}
