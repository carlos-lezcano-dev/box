export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando administración">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl bg-surface" />
    </div>
  )
}
