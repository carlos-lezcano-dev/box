import { Suspense } from 'react'
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { ApiError } from '@/api/client'
import { getMyBookings } from '@/api/bookings'
import { getMyMemberships } from '@/api/memberships'
import { BookingList } from '@/components/features/bookings/booking-list'
import { BookingsEmptyState } from '@/components/features/bookings/bookings-empty-state'
import { BookingsError } from '@/components/features/bookings/bookings-error'
import { BookingsSkeleton } from '@/components/features/bookings/bookings-skeleton'
import { MembershipChip } from '@/components/features/memberships/membership-chip'
import { PageHeader } from '@/components/ui/page-header'
import { filterActive, sortByStartTime, toBookingView } from '@/lib/booking-view'
import { UnauthorizedError, getErrorMessage } from '@/lib/errors'
import { getHeaderMembership } from '@/lib/membership-view'
import { getToken, requireUser } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Mis reservas · BOX',
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<BookingsSkeleton />}>
      <BookingsSection />
    </Suspense>
  )
}

async function BookingsSection() {
  await connection()
  try {
    await requireUser()
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect('/login')
    throw error
  }

  const token = await getToken()
  if (!token) redirect('/login')

  // El chip es decorativo: si falla F4, la lista de reservas sigue funcionando.
  let planName: string | null = null
  try {
    const { memberships } = await getMyMemberships(token)
    planName = getHeaderMembership(memberships)?.planName ?? null
  } catch {
    planName = null
  }

  type LoadResult =
    | { ok: true; views: ReturnType<typeof toBookingView>[] }
    | { ok: false; error: ApiError }

  let result: LoadResult
  try {
    const bookings = await getMyBookings(token)
    result = {
      ok: true,
      views: sortByStartTime(filterActive(bookings.map((booking) => toBookingView(booking)))),
    }
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    result = { ok: false, error }
  }

  if (!result.ok) {
    return (
      <BookingsError
        code={result.error.code}
        message={getErrorMessage(result.error.code, result.error.message)}
        requestId={result.error.requestId}
      />
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="BOX · Atleta"
        title="Mis reservas"
        subtitle="Tu entrenamiento, organizado."
        actions={<MembershipChip planName={planName} />}
      />
      {result.views.length === 0 ? (
        <BookingsEmptyState />
      ) : (
        <BookingList bookings={result.views} />
      )}
    </div>
  )
}
