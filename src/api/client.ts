import type {
  ApiErrorDetail,
  ErrorEnvelope,
  Meta,
  SuccessEnvelope,
} from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly details: ApiErrorDetail[]
  readonly requestId?: string
  readonly retryAfter?: string

  constructor(
    code: string,
    message: string,
    status: number,
    details: ApiErrorDetail[] = [],
    requestId?: string,
    retryAfter?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
    this.requestId = requestId
    this.retryAfter = retryAfter
  }
}

type QueryValue = string | number | boolean | null | undefined

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  token?: string | null
  headers?: Record<string, string>
  idempotencyKey?: string
}

export interface ApiResult<T> {
  data: T
  meta?: Meta
  message?: string
  status?: string
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_URL.replace(/\/$/, '')}${path}`)
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  }

  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    })
  } catch {
    throw new ApiError('SERVICE_UNAVAILABLE', 'No se pudo conectar con la API.', 503)
  }

  let payload: SuccessEnvelope<T> | ErrorEnvelope
  try {
    payload = (await response.json()) as SuccessEnvelope<T> | ErrorEnvelope
  } catch {
    throw new ApiError(
      'INTERNAL_ERROR',
      'La API devolvió una respuesta inválida.',
      response.status,
    )
  }

  if (!response.ok || payload.success === false) {
    const error = payload as ErrorEnvelope
    throw new ApiError(
      error.error?.code ?? 'INTERNAL_ERROR',
      error.error?.message ?? 'Ocurrió un error inesperado.',
      response.status,
      error.error?.details ?? [],
      error.request_id,
      response.headers.get('retry-after') ?? undefined,
    )
  }

  const success = payload as SuccessEnvelope<T>
  return {
    data: success.data,
    meta: success.meta,
    message: success.message,
    status: success.status,
  }
}
