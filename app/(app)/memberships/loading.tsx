export default function Loading() {
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
