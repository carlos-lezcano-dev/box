import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { ClearInvalidSession } from '@/components/features/auth/clear-invalid-session'
import { LoginForm } from '@/components/features/auth/login-form'
import { getCurrentUser } from '@/lib/session'

export const metadata: Metadata = {
  title: 'Ingresar — BOX',
}

export default function LoginPage({ searchParams }: PageProps<'/login'>) {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-sm animate-pulse rounded-2xl bg-surface" />}>
      <LoginSection searchParams={searchParams} />
    </Suspense>
  )
}

async function LoginSection({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  await connection()
  const user = await getCurrentUser()
  if (user) redirect('/')
  return (
    <>
      <ClearInvalidSession />
      <LoginForm searchParams={searchParams} />
    </>
  )
}
