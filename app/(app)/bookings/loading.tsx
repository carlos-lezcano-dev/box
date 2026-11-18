import { BookingsSkeleton } from '@/components/features/bookings/bookings-skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-surface" />
      <div className="h-5 w-72 animate-pulse rounded-lg bg-surface" />
      <BookingsSkeleton />
    </div>
  )
}
