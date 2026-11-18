const ITEMS = [
  { value: '130', label: 'Pendiente de confirmación' },
  { value: '18', label: 'Pendiente de confirmación' },
  { value: '130', label: 'Pendiente de confirmación' },
  { value: '$6.240.000', label: 'Pendiente de confirmación' },
]

export function AdminMembershipMetrics() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ITEMS.map((item, index) => (
        <div key={index} className="rounded-xl border bg-surface p-5">
          <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
          <p className="mt-1 text-xs text-muted">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
