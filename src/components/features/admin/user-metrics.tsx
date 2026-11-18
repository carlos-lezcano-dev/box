export function UserMetrics({
  todos,
  atletas,
  entrenadores,
  administradores,
}: {
  todos: number
  atletas: number
  entrenadores: number
  administradores: number
}) {
  const items = [
    { label: 'Todos', value: todos },
    { label: 'Atletas', value: atletas },
    { label: 'Entrenadores', value: entrenadores },
    { label: 'Administradores', value: administradores },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-surface p-5">
          <p className="text-3xl font-semibold tracking-tight">{item.value}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  )
}
