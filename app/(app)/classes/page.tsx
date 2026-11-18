import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { ApiError } from '@/api/client'
import { getMyMemberships } from '@/api/memberships'
import { getWods } from '@/api/wods'
import { ClassList } from '@/components/features/classes/class-list'
import { ClassSkeleton } from '@/components/features/classes/class-skeleton'
import { EmptyState } from '@/components/ui/state-panels'
import { resolveClassRange, toClassView } from '@/lib/class-view'
import { getDisplayName } from '@/lib/display'
import { getErrorMessage, UnauthorizedError } from '@/lib/errors'
import { pickCurrent } from '@/lib/membership-view'
import { getToken, requireUser } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Explorar y reservar clases · BOX',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function ClassesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<ClassSkeleton />}>
      <ClassesSection searchParams={searchParams} />
    </Suspense>
  )
}

async function ClassesSection({ searchParams }: { searchParams: SearchParams }) {
  await connection()

  const params = await searchParams
  const range = resolveClassRange(params.from, params.to)

  let user
  try {
    user = await requireUser()
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect('/login')
    throw error
  }
  const token = await getToken()
  if (!token) redirect('/login')

  let wods: Awaited<ReturnType<typeof getWods>>['wods'] = []
  let agendaError: ApiError | null = null
  try {
    const result = await getWods(token, {
      from: range.from,
      to: range.to,
      limit: 100,
    })
    wods = result.wods
  } catch (error) {
    if (error instanceof ApiError) agendaError = error
    else throw error
  }

  // El chip del shell es decorativo; aquí sólo decides si se puede reservar.
  let hasActiveMembership = false
  try {
    const { memberships } = await getMyMemberships(token)
    const current = pickCurrent(memberships)
    hasActiveMembership = current?.status === 'ACTIVE'
  } catch {
    hasActiveMembership = false
  }

  const displayName = getDisplayName(user.full_name, user.email)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          BOX · Agenda
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Hola, {displayName}. Elegí tu próximo turno.
        </h1>
        <p className="mt-2 text-sm text-muted">
          Explorá los turnos disponibles y reservá tu lugar.
        </p>
      </div>

      {agendaError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"
        >
          <p className="font-semibold">No pudimos cargar la agenda</p>
          <p className="mt-1">
            {getErrorMessage(agendaError.code, agendaError.message)}
          </p>
          <p className="mt-2 font-mono text-xs opacity-75">
            {agendaError.code}
            {agendaError.requestId ? ` · ${agendaError.requestId}` : ''}
          </p>
          <Link
            href={`/classes?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`}
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
          >
            Reintentar
          </Link>
        </div>
      ) : wods.length === 0 ? (
        <EmptyState title="No hay turnos en este rango" />
      ) : (
        <ClassList
          classes={wods.map((wod) => toClassView(wod))}
          hasActiveMembership={hasActiveMembership}
          todayKey={range.today}
        />
      )}
    </div>
  )
}
