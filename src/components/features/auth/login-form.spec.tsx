import { Suspense } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm } from '@/components/features/auth/login-form'

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => navigation }))

type ResponseOptions = {
  status?: number
  headers?: Record<string, string>
}

function jsonResponse(payload: unknown, options: ResponseOptions = {}): Response {
  const status = options.status ?? 200
  const headers = Object.fromEntries(
    Object.entries(options.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value]),
  )
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => payload,
  } as unknown as Response
}

function renderForm(next: string) {
  // searchParams es una Promise en Next 16; el componente la lee con use().
  // React 19 detecta las promesas ya resueltas por su campo `status`, así que
  // marcarla evita que el test quede suspendido esperando un re-render.
  const value = { next }
  const searchParams = Promise.resolve(value) as Promise<{ next: string }> & {
    status?: string
    value?: { next: string }
  }
  searchParams.status = 'fulfilled'
  searchParams.value = value
  return render(
    <Suspense fallback={<div>Cargando…</div>}>
      <LoginForm searchParams={searchParams} />
    </Suspense>,
  )
}

async function submitCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email'), 'lucia@box-core.test')
  await user.type(screen.getByLabelText('Contraseña'), 'TestPassw0rd!')
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

describe('LoginForm', () => {
  beforeEach(() => {
    navigation.replace.mockReset()
    navigation.refresh.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deshabilita el submit mientras la petición está pendiente y respeta next', async () => {
    let resolveRequest: (response: Response) => void = () => undefined
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderForm('/bookings')
    await submitCredentials(user)

    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({
      email: 'lucia@box-core.test',
      password: 'TestPassw0rd!',
    })

    resolveRequest(jsonResponse({ success: true, data: {} }))
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/bookings'))
    expect(navigation.refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
  })

  it.each([
    ['AUTH_INVALID_CREDENTIALS', 401, 'Email o contraseña incorrectos.'],
    ['AUTH_USER_INACTIVE', 403, 'Tu cuenta está inactiva.'],
  ])('muestra un mensaje distinto por código: %s', async (code, status, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { success: false, error: { code }, request_id: 'req-e2e' },
          { status },
        ),
      ),
    )

    const user = userEvent.setup()
    renderForm('/')
    await submitCredentials(user)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(message)
    expect(alert).toHaveTextContent(code)
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it('incluye los segundos de Retry-After en errores RATE_LIMITED', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          { success: false, error: { code: 'RATE_LIMITED' } },
          { status: 429, headers: { 'Retry-After': '7' } },
        ),
      ),
    )

    const user = userEvent.setup()
    renderForm('/')
    await submitCredentials(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Reintentá en 7 s.')
    expect(navigation.replace).not.toHaveBeenCalled()
  })

  it('iguala el email con trim antes de enviarlo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: {} }))
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderForm('/')
    await user.type(await screen.findByLabelText('Email'), '  lucia@box-core.test  ')
    await user.type(screen.getByLabelText('Contraseña'), 'TestPassw0rd!')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body)).email).toBe('lucia@box-core.test')
  })
})
