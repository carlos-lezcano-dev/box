import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AdminSubnav } from '@/components/features/admin/admin-subnav'
import { getCurrentUser } from '@/lib/session'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  )
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') return <AccessRestricted />

  return (
    <div>
      <AdminSubnav />
      {children}
    </div>
  )
}

function AccessRestricted() {
  return (
    <div role="alert" className="rounded-xl border bg-surface p-8">
      <h1 className="text-xl font-semibold">Acceso restringido</h1>
      <p className="mt-2 text-sm text-muted">
        Esta sección está disponible solo para administradores.
      </p>
    </div>
  )
}
