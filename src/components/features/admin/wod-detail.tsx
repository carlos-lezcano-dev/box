import { BookingRoster } from '@/components/features/admin/booking-roster'
import { WodActions } from '@/components/features/admin/wod-actions'
import { PageHeader } from '@/components/ui/page-header'
import { describeEvent, getCapacityLabel } from '@/lib/admin-view'
import type { Wod, WodRoster } from '@/types/api'

export function WodDetail({
  wod,
  roster,
  coachName,
  coaches,
}: {
  wod: Wod
  roster: WodRoster
  coachName: string
  coaches: Array<{ user_id: string; full_name: string }>
}) {
  return (
    <div>
      <PageHeader
        eyebrow="BOX · Detalle de turno"
        title="Detalle de turno y lista de espera"
        subtitle={`${wod.title} · ${getCapacityLabel(wod.confirmed_count, wod.max_capacity)}`}
        actions={<WodActions wod={wod} coaches={coaches} />}
      />

      <section className="rounded-xl border bg-surface p-6">
        <h2 className="text-xl font-semibold">WOD · {wod.title}</h2>
        {wod.description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{wod.description}</p>
        )}
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Fecha y hora</dt>
            <dd className="mt-1 font-medium">{describeEvent(wod)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Equipo</dt>
            <dd className="mt-1 font-medium">{coachName}</dd>
          </div>
        </dl>
      </section>

      <div className="mt-6">
        <BookingRoster roster={roster} />
      </div>
    </div>
  )
}
