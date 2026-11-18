export function BookingsSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando reservas" className="space-y-3">
      {[0, 1, 2].map((key) => (
        <div
          key={key}
          data-testid="booking-skeleton"
          className="h-28 animate-pulse rounded-2xl bg-surface"
        />
      ))}
    </div>
  )
}
