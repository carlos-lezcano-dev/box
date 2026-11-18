/** Skeleton compartido por `loading.tsx` y el boundary de la página. */
export function ClassSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando clases" aria-live="polite">
      <div className="h-5 w-40 animate-pulse rounded-lg bg-surface" />
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3, 4].map((key) => (
          <div key={key} className="h-10 w-20 shrink-0 animate-pulse rounded-lg bg-surface" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-64 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
      <span className="sr-only">Cargando clases…</span>
    </div>
  )
}
