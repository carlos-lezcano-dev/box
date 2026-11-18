import Link from 'next/link'

export function BookingsEmptyState() {
  return (
    <div
      data-testid="bookings-empty-state"
      className="rounded-2xl border border-dashed bg-surface px-6 py-16 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-xl">
        ◷
      </div>
      <h2 className="mt-5 text-lg font-semibold">Todavía no tenés reservas</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
        Tu entrenamiento, organizado. Cuando reserves un turno, vas a verlo acá.
      </p>
      <Link
        href="/classes"
        className="mt-7 inline-flex rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white hover:opacity-90"
      >
        Explorar clases
      </Link>
    </div>
  )
}
