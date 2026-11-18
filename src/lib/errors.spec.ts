import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { actionFailure, getErrorMessage, UnauthorizedError } from '@/lib/errors'

describe('ApiError', () => {
  it('expone code, status, message y request_id (requestId en la clase)', () => {
    const error = new ApiError(
      'AUTH_INVALID_CREDENTIALS',
      'Email o contraseña incorrectos.',
      401,
      [],
      'req-401',
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApiError')
    expect(error.code).toBe('AUTH_INVALID_CREDENTIALS')
    expect(error.status).toBe(401)
    expect(error.message).toBe('Email o contraseña incorrectos.')
    expect(error.requestId).toBe('req-401')
  })

  it('conserva detalles y Retry-After', () => {
    const details = [{ field: 'email', rule: 'format', message: 'Email inválido' }]
    const error = new ApiError(
      'RATE_LIMITED',
      'Demasiados intentos.',
      429,
      details,
      'req-429',
      '7',
    )

    expect(error.details).toEqual(details)
    expect(error.retryAfter).toBe('7')
  })
})

describe('mapa de errores', () => {
  it('resuelve el copy por code con fallback', () => {
    expect(getErrorMessage('AUTH_INVALID_CREDENTIALS')).toBe('Email o contraseña incorrectos.')
    expect(getErrorMessage('AUTH_USER_INACTIVE')).toBe('Tu cuenta está inactiva.')
    expect(getErrorMessage('CODIGO_NUEVO', 'Texto por defecto')).toBe('Texto por defecto')
    expect(getErrorMessage('CODIGO_NUEVO')).toBe('Error desconocido (CODIGO_NUEVO).')
  })

  it('actionFailure transforma los detalles en campos', () => {
    expect(
      actionFailure('VALIDATION_ERROR', 'Revisá los campos marcados.', 'req-400', [
        { field: 'email', rule: 'format', message: 'Email inválido' },
      ]),
    ).toEqual({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Revisá los campos marcados.',
      requestId: 'req-400',
      fields: { email: 'Email inválido' },
    })
  })

  it('UnauthorizedError representa una sesión caída', () => {
    const error = new UnauthorizedError()
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('UnauthorizedError')
    expect(error.message).toBe('Sesión no válida')
  })
})
