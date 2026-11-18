import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { ApiError } from '@/api/client'
import { getWodById, listCoaches } from '@/api/admin-wods'
import { getWodRoster } from '@/api/admin-bookings'
import { WodDetail } from '@/components/features/admin/wod-detail'
import { ErrorPanel } from '@/components/ui/state-panels'
import { getErrorMessage } from '@/lib/errors'
import { getToken } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Detalle de turno · BOX',
}

type WodDetailData = {
  wod: Awaited<ReturnType<typeof getWodById>>
  roster: Awaited<ReturnType<typeof getWodRoster>>
  coachNames: Awaited<ReturnType<typeof listCoaches>>
}

type LoadResult = { ok: true; data: WodDetailData } | { ok: false; error: ApiError }

async function loadWodDetail(token: string, wodId: string): Promise<LoadResult> {
  try {
    const [wod, roster, coachNames] = await Promise.all([
      getWodById(token, wodId),
      getWodRoster(token, wodId),
      listCoaches(token),
    ])
    return { ok: true, data: { wod, roster, coachNames } }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error }
    throw error
  }
}

export default function WodDetailPage({
  params,
}: PageProps<'/admin/schedule/[wodId]'>) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
      <WodDetailSection params={params} />
    </Suspense>
  )
}

async function WodDetailSection({
  params,
}: {
  params: Promise<{ wodId: string }>
}) {
  const { wodId } = await params
  const token = await getToken()
  if (!token) redirect('/login')

  const result = await loadWodDetail(token, wodId)
  if (!result.ok) {
    if (result.error.code === 'WOD_NOT_FOUND') notFound()
    return (
      <ErrorPanel
        code={result.error.code}
        message={getErrorMessage(result.error.code, result.error.message)}
        requestId={result.error.requestId}
      />
    )
  }

  const { wod, roster, coachNames } = result.data
  const coaches = Array.from(coachNames, ([user_id, full_name]) => ({
    user_id,
    full_name,
  }))

  return (
    <WodDetail
      wod={wod}
      roster={roster}
      coachName={wod.coach_id ? (coachNames.get(wod.coach_id) ?? 'Sin asignar') : 'Sin asignar'}
      coaches={coaches}
    />
  )
}
