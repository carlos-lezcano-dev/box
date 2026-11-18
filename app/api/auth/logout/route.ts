import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/constants'

export async function POST() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  return NextResponse.json(
    { success: true, data: { loggedOut: true } },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
