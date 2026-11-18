'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getErrorMessage } from '@/lib/errors'

type Props = {
  searchParams: Promise<{ next?: string | string[] }>
}

type ErrorState = {
  code: string
  message: string
  requestId?: string
  retryAfter?: string
} | null

export function LoginForm({ searchParams }: Props) {
  const router = useRouter()
  const params = use(searchParams)
  const next = typeof params.next === 'string' ? params.next : '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ErrorState>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const payload = await response.json()
      if (!response.ok || payload.success === false) {
        const code = payload.error?.code ?? 'INTERNAL_ERROR'
        const retryAfter = response.headers.get('Retry-After') ?? undefined
        const backendMessage =
          typeof payload.error?.message === 'string' ? payload.error.message : undefined
        let message = backendMessage ?? getErrorMessage(code)
        if (
          code === 'RATE_LIMITED' &&
          retryAfter &&
          Number.isFinite(Number(retryAfter))
        ) {
          message = `${message} Reintentá en ${retryAfter} s.`
        }
        setError({
          code,
          message,
          requestId: payload.request_id,
          retryAfter,
        })
        return
      }
      const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/'
      router.replace(destination)
      router.refresh()
    } catch {
      setError({
        code: 'SERVICE_UNAVAILABLE',
        message: getErrorMessage('SERVICE_UNAVAILABLE'),
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border bg-surface p-8 shadow-sm">
      <p className="text-xs font-semibold tracking-[0.3em] text-muted">BOX</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Ingresá a tu cuenta</h1>
      <p className="mt-2 text-sm text-muted">Usá tus credenciales para continuar.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </label>
        <label className="block text-sm font-medium">
          Contraseña
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">{error.message}</p>
            <p className="mt-1 font-mono text-xs opacity-70">
              {error.code}
              {error.requestId ? ` · ${error.requestId}` : ''}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
