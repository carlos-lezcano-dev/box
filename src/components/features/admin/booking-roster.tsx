'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cancelBookingAction } from '@/actions/admin'
import { ConfirmDialog } from '@/components/features/admin/confirm-dialog'
import { getCapacityLabel, getInitials } from '@/lib/admin-view'
import { formatTime } from '@/lib/datetime'
import type { RosterEntry, WodRoster } from '@/types/api'

export function BookingRoster({ roster }: { roster: WodRoster }) {
  const router = useRouter()
  const [selected, setSelected] = useState<RosterEntry | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const waitlist = [...roster.waitlist].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  )

  return (
    <div className="space-y-6">
      {notice && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <section className="rounded-xl border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Participantes</h2>
          <span className="rounded-full border px-3 py-1 text-xs font-semibold">
            {getCapacityLabel(roster.confirmed_count, roster.max_capacity)}
          </span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {roster.confirmed.length === 0 ? (
            <p className="text-sm text-muted">No hay participantes confirmados.</p>
          ) : (
            roster.confirmed.map((entry) => (
              <RosterRow
                key={entry.booking_id}
                entry={entry}
                onCancel={() => setSelected(entry)}
              />
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lista de espera</h2>
          <span className="text-sm text-muted">{roster.waitlist_count} atletas</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {waitlist.length === 0 ? (
            <p className="text-sm text-muted">No hay atletas en espera.</p>
          ) : (
            waitlist.map((entry) => (
              <RosterRow
                key={entry.booking_id}
                entry={entry}
                position={entry.position}
                onCancel={() => setSelected(entry)}
              />
            ))
          )}
        </div>
      </section>

      <ConfirmDialog
        open={selected !== null}
        title="Cancelar reserva"
        description={`¿Cancelar la reserva de ${selected?.full_name ?? 'este atleta'}?`}
        confirmLabel="Cancelar reserva"
        onCancel={() => setSelected(null)}
        onConfirm={() => cancelBookingAction(selected?.booking_id ?? '')}
        onSuccessNotice={(message) => {
          setNotice(message)
          router.refresh()
        }}
      />
    </div>
  )
}

function RosterRow({
  entry,
  position,
  onCancel,
}: {
  entry: RosterEntry
  position?: number
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold">
        {getInitials(entry.full_name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.full_name}</p>
        <p className="text-xs text-muted">
          {position ? `Posición ${position} · ` : ''}
          {formatTime(entry.booked_at)}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border px-2.5 py-1.5 text-xs text-red-700"
      >
        Cancelar
      </button>
    </div>
  )
}
