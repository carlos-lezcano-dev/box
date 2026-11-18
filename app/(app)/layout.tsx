import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { AppChrome } from '@/components/layout/app-chrome'
import { getMyMemberships } from '@/api/memberships'
import { UnauthorizedError } from '@/lib/errors'
import { getHeaderMembership } from '@/lib/membership-view'
import { getToken, requireUser } from '@/lib/session'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Saltar al contenido
      </a>
      <Suspense fallback={<ShellFallback />}>
        <Shell>{children}</Shell>
      </Suspense>
    </>
  )
}

async function Shell({ children }: { children: React.ReactNode }) {
  await connection()
  let user
  try {
    user = await requireUser()
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect('/login')
    throw error
  }

  const token = await getToken()
  let membership: ReturnType<typeof getHeaderMembership> = null
  if (token) {
    try {
      const { memberships } = await getMyMemberships(token)
      membership = getHeaderMembership(memberships)
    } catch {
      // El chip es decorativo: un fallo de membresías no rompe el shell.
    }
  }

  return (
    <AppChrome user={user} membership={membership}>
      {children}
    </AppChrome>
  )
}

function ShellFallback() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="h-10 w-40 animate-pulse rounded-lg bg-surface" />
      <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface" />
    </div>
  )
}
