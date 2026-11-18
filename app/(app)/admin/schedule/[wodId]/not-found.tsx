import Link from 'next/link'

export default function WodNotFound() {
  return (
    <div className="rounded-xl border bg-surface p-8">
      <h1 className="text-xl font-semibold">No encontramos ese turno</h1>
      <p className="mt-2 text-sm text-muted">Puede haber sido cancelado o ya no estar disponible.</p>
      <Link
        href="/admin/schedule"
        className="mt-6 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white"
      >
        Volver a la agenda
      </Link>
    </div>
  )
}
