import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { getMyMemberships } from '@/api/memberships'
import { ApiError } from '@/api/client'
import { MembershipEmptyState } from '@/components/features/memberships/membership-empty-state'
import { getPaymentMethodLabel, MembershipSummaryCard } from '@/components/features/memberships/membership-summary-card'
import { PageHeader } from '@/components/ui/page-header'
import { AUTH_CODES, UnauthorizedError } from '@/lib/errors'
import { pickCurrent, toMembershipView } from '@/lib/membership-view'
import { getToken, requireUser } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Membresías y pagos · BOX',
}

export default function MembershipsPage() {
  return (
    <div className="w-full">
      <PageHeader
        eyebrow="BOX · Membresías"
        title="Membresías y pagos mensuales"
        subtitle="Vigencias claras. Cuentas al día."
      />
      <Suspense fallback={<MembershipsFallback />}>
        <MembershipsSection />
      </Suspense>
    </div>
  )
}

async function MembershipsSection() {
  await connection()

  try {
    await requireUser()
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect('/login')
    throw error
  }

  const token = await getToken()
  if (!token) redirect('/login')

  let result: Awaited<ReturnType<typeof getMyMemberships>>
  try {
    result = await getMyMemberships(token)
  } catch (error) {
    if (error instanceof ApiError && AUTH_CODES.has(error.code)) redirect('/login')
    throw error
  }

  const current = pickCurrent(result.memberships)
  if (!current) return <MembershipEmptyState />

  const view = toMembershipView(current)

  return (
    <section
      aria-labelledby="memberships-section-title"
      className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3"
    >
      <h2 id="memberships-section-title" className="sr-only">
        Detalle de tu membresía
      </h2>
      <div className="w-full lg:col-span-2">
        <MembershipSummaryCard view={view} />
      </div>
      <aside
        aria-labelledby="membership-detail-title"
        className="h-full w-full rounded-2xl border bg-surface p-6"
      >
        <h2 id="membership-detail-title" className="text-sm font-semibold">
          Detalle del plan
        </h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Inicio</dt>
            <dd className="mt-1">{view.start_date}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Vencimiento</dt>
            <dd className="mt-1">{view.end_date}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Método de pago
            </dt>
            <dd className="mt-1">{getPaymentMethodLabel(current.payment_method)}</dd>
          </div>
        </dl>
        <p className="mt-6 text-xs leading-5 text-muted">
          Los pagos se registran en el box. Si necesitás cambiar los datos de tu plan, hablá con el
          equipo.
        </p>
      </aside>
    </section>
  )
}

function MembershipsFallback() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando membresías">
      <div className="h-6 w-32 animate-pulse rounded-full bg-surface" />
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-72 animate-pulse rounded-2xl bg-surface lg:col-span-2" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  )
}
