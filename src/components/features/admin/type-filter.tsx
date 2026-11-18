'use client'

export function TypeFilter({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted">Tipo:</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border bg-white px-3 py-2 text-sm"
      >
        <option value="todos">todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
