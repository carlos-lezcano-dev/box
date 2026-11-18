import { Suspense } from 'react'
import type { Metadata } from 'next'
import { io } from 'next/cache'
import { redirect } from 'next/navigation'
import { ApiError } from '@/api/client'
import { getWods, listCoaches } from '@/api/admin-wods'
import { CreateWodTrigger } from '@/components/features/admin/create-wod-trigger'
import { WeekRange } from '@/components/features/admin/week-range'
import { WodScheduleList } from '@/components/features/admin/wod-schedule-list'
import { PageHeader } from '@/components/ui/page-header'
import { ErrorPanel } from '@/components/ui/state-panels'
import { toWodView } from '@/lib/admin-view'
import { getBoxToday, getWeekRange, toDateString } from '@/lib/datetime'
import { getErrorMessage } from '@/lib/errors'
import { getToken } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Agenda de turnos · BOX',
}

type ScheduleData = {
  wodsResult: Awaited<ReturnType<typeof getWods>>
  coachNames: Awaited<ReturnType<typeof listCoaches>>
}

type LoadResult = { ok: true; data: ScheduleData } | { ok: false; error: ApiError }

async function loadSchedule(
  token: string,
  from: string,
  to: string,
): Promise<LoadResult> {
  try {
    const [wodsResult, coachNames] = await Promise.all([
      getWods(token, { from, to, limit: 100 }),
      listCoaches(token),
    ])
    return { ok: true, data: { wodsResult, coachNames } }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error }
    throw error
  }
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
      <ScheduleSection />
    </Suspense>
  )
}

async function ScheduleSection() {
  await io()
  const week = getWeekRange()
  const token = await getToken()
  if (!token) redirect('/login')

  const result = await loadSchedule(token, week.fromIso, week.toIso)
  if (!result.ok) {
    return (
      <ErrorPanel
        code={result.error.code}
        message={getErrorMessage(result.error.code, result.error.message)}
        requestId={result.error.requestId}
      />
    )
  }

  const { wodsResult, coachNames } = result.data
  const wods = wodsResult.wods.map((wod) => toWodView(wod, coachNames))
  const coaches = Array.from(coachNames, ([user_id, full_name]) => ({
    user_id,
    full_name,
  }))

  return (
    <div>
      <PageHeader
        eyebrow="BOX · Agenda"
        title="Agenda de turnos"
        subtitle="Cada turno, bajo control. Clases, entrenadores y cupos de la semana. Seleccioná un día para gestionarlo."
        actions={<CreateWodTrigger coaches={coaches} defaultDate={toDateString(week.monday)} />}
      />
      <div className="mb-6">
        <WeekRange label={week.label} />
      </div>
      <WodScheduleList wods={wods} />
      <p className="mt-6 text-xs text-muted">
        Rango enviado a la API: {week.fromIso} → {week.toIso} (el extremo final es exclusivo).
        Hoy en el box: {getBoxToday()}.
      </p>
    </div>
  )
}
