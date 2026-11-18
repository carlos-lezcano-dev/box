import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, ApiError } from '@/api/client'

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

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('desempaqueta success/data/meta y pide con cache no-store', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: { user_id: 'u-1' },
        meta: { page: 1, limit: 10, total: 2, total_pages: 1 },
        message: 'OK',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiRequest<{ user_id: string }>('/users/me', {
      token: 'token-1',
      query: { page: 1, omitido: '' },
    })

    expect(result.data).toEqual({ user_id: 'u-1' })
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 2, total_pages: 1 })
    expect(result.message).toBe('OK')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:3000/api/v1/users/me?page=1')
    expect(init.method).toBe('GET')
    expect(init.cache).toBe('no-store')
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer token-1',
    })
  })

  it('serializa el body y agrega las cabeceras opcionales', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { ok: true } }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('/bookings', {
      method: 'POST',
      body: { wod_id: 'w-1' },
      idempotencyKey: 'key-1',
      headers: { 'X-Test': '1' },
    })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ wod_id: 'w-1' }))
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Idempotency-Key': 'key-1',
      'X-Test': '1',
    })
  })

  it('lanza ApiError cuando success es false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            success: false,
            error: {
              code: 'AUTH_INVALID_CREDENTIALS',
              message: 'Email o contraseña incorrectos.',
              details: [],
            },
            request_id: 'req-401',
          },
          { status: 401, headers: { 'Retry-After': '7' } },
        ),
      ),
    )

    const error = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'a@b.test', password: 'x' },
    }).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      code: 'AUTH_INVALID_CREDENTIALS',
      status: 401,
      message: 'Email o contraseña incorrectos.',
      requestId: 'req-401',
      retryAfter: '7',
    })
  })

  it('lanza ApiError cuando HTTP no está OK aunque el envelope diga success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ success: true, data: {} }, { status: 503 })),
    )

    const error = await apiRequest('/users/me').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 503,
      message: 'Ocurrió un error inesperado.',
    })
  })

  it('lanza SERVICE_UNAVAILABLE si fetch falla y INTERNAL_ERROR si el JSON es inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const networkError = await apiRequest('/users/me').catch((caught: unknown) => caught)
    expect(networkError).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
      message: 'No se pudo conectar con la API.',
    })

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => {
          throw new SyntaxError('not json')
        },
      }),
    )
    const parseError = await apiRequest('/users/me').catch((caught: unknown) => caught)
    expect(parseError).toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 200,
      message: 'La API devolvió una respuesta inválida.',
    })
  })
})
