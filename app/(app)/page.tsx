import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPanelMetrics } from '@/api/dashboard'
import type { PanelMetrics } from '@/api/dashboard'
import { MetricCard } from '@/components/features/dashboard/metric-card'
import { NextWodsCard } from '@/components/features/dashboard/next-wods-card'
import { PanelHeader } from '@/components/features/dashboard/panel-header'
import { toPanelGeneralView } from '@/lib/dashboard-view'
import { getBoxToday } from '@/lib/datetime'
import { AUTH_CODES, UnauthorizedError } from '@/lib/errors'
import { getToken, requireUser } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Panel general · BOX',
}

export default function Page() {
  return (
    <Suspense fallback={<PanelFallback />}>
      <PanelGate />
    </Suspense>
  )
}

async function PanelGate() {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser()
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect('/login?next=/')
    throw error
  }

  if (user.role !== 'ADMIN') redirect(`/classes?from=${getBoxToday()}`)

  const token = await getToken()
  if (!token) redirect('/login?next=/')

  // Cada bloque ya llega degradado: un fallo no tapa el resto del panel.
  const metrics = await getPanelMetrics(token)
  const failedCodes = [metrics.athletes, metrics.memberships, metrics.wods].flatMap(
    (result) => (result.ok ? [] : [result.code]),
  )

  if (failedCodes.some((code) => AUTH_CODES.has(code))) redirect('/login?next=/')
  if (failedCodes.includes('AUTH_FORBIDDEN')) return <AccessRestricted />

  const view = toPanelGeneralView({
    athletesTotal: metrics.athletes.ok ? metrics.athletes.total : undefined,
    membershipsTotal: metrics.memberships.ok ? metrics.memberships.total : undefined,
    wods: metrics.wods.ok ? metrics.wods.wods : undefined,
  })

  return (
    <div>
      <PanelHeader />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense
          fallback={<MetricCard label="Atletas" value={null} state="loading" testId="athletes-card" />}
        >
          <AthletesCard metrics={metrics} total={view.totalAthletes} />
        </Suspense>
        <Suspense
          fallback={
            <MetricCard label="Membresías" value={null} state="loading" testId="memberships-card" />
          }
        >
          <MembershipsCard metrics={metrics} total={view.totalMemberships} />
        </Suspense>
        <Suspense
          fallback={
            <MetricCard
              label="Recaudación"
              value={null}
              state="loading"
              testId="collected-amount-card"
            />
          }
        >
          <CollectedAmountCard amount={view.collectedAmount} />
        </Suspense>
        <Suspense
          fallback={
            <MetricCard
              label="Próximos turnos"
              value={null}
              state="loading"
              testId="upcoming-count-card"
            />
          }
        >
          <UpcomingCountCard count={view.nextWods.length} />
        </Suspense>
      </div>

      <Suspense
        fallback={<NextWodsCard wods={[]} state="loading" />}
      >
        <WodsSection metrics={metrics} wods={view.nextWods} />
      </Suspense>
    </div>
  )
}

function AthletesCard({
  metrics,
  total,
}: {
  metrics: PanelMetrics
  total: number | null
}) {
  if (!metrics.athletes.ok) {
    return (
      <MetricCard
        label="Atletas"
        value={null}
        state="error"
        code={metrics.athletes.code}
        message={metrics.athletes.message}
        testId="athletes-card"
      />
    )
  }
  return <MetricCard label="Atletas" value={total} testId="athletes-card" />
}

function MembershipsCard({
  metrics,
  total,
}: {
  metrics: PanelMetrics
  total: number | null
}) {
  if (!metrics.memberships.ok) {
    return (
      <MetricCard
        label="Membresías"
        value={null}
        state="error"
        code={metrics.memberships.code}
        message={metrics.memberships.message}
        testId="memberships-card"
      />
    )
  }
  return <MetricCard label="Membresías" value={total} testId="memberships-card" />
}

/** Sin fuente confirmada: el view devuelve null y la tarjeta no se monta. */
function CollectedAmountCard({ amount }: { amount: number | null }) {
  return <MetricCard label="Recaudación" value={amount} testId="collected-amount-card" />
}

function UpcomingCountCard({ count }: { count: number }) {
  return <MetricCard label="Próximos turnos" value={count} testId="upcoming-count-card" />
}

function WodsSection({ metrics, wods }: { metrics: PanelMetrics; wods: PanelGeneralWods }) {
  if (!metrics.wods.ok) {
    return (
      <NextWodsCard
        wods={[]}
        state="error"
        code={metrics.wods.code}
        message={metrics.wods.message}
      />
    )
  }
  return <NextWodsCard wods={wods} />
}

type PanelGeneralWods = ReturnType<typeof toPanelGeneralView>['nextWods']

function AccessRestricted() {
  return (
    <section role="alert" className="rounded-xl border bg-surface p-8">
      <h1 className="text-xl font-semibold">Acceso restringido</h1>
      <p className="mt-2 text-sm text-zinc-700">
        Esta sección está disponible solo para administradores.
      </p>
    </section>
  )
}

function PanelFallback() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Cargando panel general</span>
      <div className="h-10 w-72 animate-pulse rounded-lg bg-surface" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-28 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-surface" />
    </div>
  )
}
