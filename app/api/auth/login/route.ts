import { NextResponse } from 'next/server'
import { ApiError } from '@/api/client'
import { login } from '@/api/auth'
import { SESSION_COOKIE } from '@/lib/constants'
import { getErrorMessage } from '@/lib/errors'
import type { LoginRequest } from '@/types/api'

export async function POST(request: Request) {
  let body: LoginRequest
  try {
    body = (await request.json()) as LoginRequest
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'MALFORMED_JSON', message: 'JSON inválido.' } },
      { status: 400 },
    )
  }

  if (
    typeof body.email !== 'string' ||
    !body.email.trim() ||
    typeof body.password !== 'string' ||
    !body.password
  ) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email y contraseña son obligatorios.' },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const { data } = await login(body)
    const response = NextResponse.json(
      {
        success: true,
        data: { user: data.user },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
    response.cookies.set(SESSION_COOKIE, data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.expires_in,
    })
    return response
  } catch (error) {
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError('INTERNAL_ERROR', 'No se pudo iniciar sesión.', 500)
    const headers: Record<string, string> = { 'Cache-Control': 'no-store' }
    if (apiError.retryAfter) headers['Retry-After'] = apiError.retryAfter
    return NextResponse.json(
      {
        success: false,
        error: {
          code: apiError.code,
          message: getErrorMessage(apiError.code, apiError.message),
          details: apiError.details,
        },
        request_id: apiError.requestId,
      },
      { status: apiError.status, headers },
    )
  }
}
