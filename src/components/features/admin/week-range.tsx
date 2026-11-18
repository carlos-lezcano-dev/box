export function WeekRange({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border bg-surface px-4 py-2 text-sm font-medium">
      <span aria-hidden="true">📅</span>
      <span>{label}</span>
    </div>
  )
}
