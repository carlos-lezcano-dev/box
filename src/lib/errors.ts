import type { ActionResult, ApiErrorDetail } from '@/types/api'

export class UnauthorizedError extends Error {
  constructor() {
    super('Sesión no válida')
    this.name = 'UnauthorizedError'
  }
}

const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Revisá los campos marcados.',
  MALFORMED_JSON: 'La solicitud no tiene un JSON válido.',
  ROUTE_NOT_FOUND: 'No encontramos el recurso solicitado.',
  PAYLOAD_TOO_LARGE: 'El contenido enviado es demasiado grande.',
  RATE_LIMITED: 'Demasiados intentos. Esperá un momento y volvé a probar.',
  IDEMPOTENCY_CONFLICT: 'La clave de idempotencia ya se usó con otros datos.',
  SERVICE_UNAVAILABLE: 'El servicio no está disponible en este momento.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado.',
  AUTH_INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
  AUTH_TOKEN_MISSING: 'Tu sesión no es válida. Iniciá sesión nuevamente.',
  AUTH_TOKEN_INVALID: 'Tu sesión no es válida. Iniciá sesión nuevamente.',
  AUTH_TOKEN_EXPIRED: 'Tu sesión venció. Iniciá sesión nuevamente.',
  AUTH_USER_INACTIVE: 'Tu cuenta está inactiva.',
  AUTH_FORBIDDEN: 'No tenés permisos para realizar esta acción.',
  USER_EMAIL_TAKEN: 'Ya existe un usuario con ese email.',
  USER_NOT_FOUND: 'No encontramos ese usuario.',
  USER_ROLE_NOT_ALLOWED: 'No podés asignar ese rol.',
  MEMBERSHIP_NOT_FOUND: 'No encontramos esa membresía.',
  MEMBERSHIP_INVALID_PERIOD: 'El rango de fechas no es válido.',
  MEMBERSHIP_INVALID_AMOUNT: 'El importe no es válido.',
  MEMBERSHIP_INVALID_TRANSITION: 'No se permite ese cambio de estado.',
  MEMBERSHIP_REQUIRED: 'Se requiere una membresía activa.',
  WOD_NOT_FOUND: 'No encontramos ese turno.',
  WOD_INVALID_TIME_RANGE: 'Revisá el orden y la duración de los horarios.',
  WOD_START_IN_PAST: 'El turno debe comenzar en el futuro.',
  WOD_COACH_INVALID: 'El entrenador elegido no es válido.',
  WOD_ALREADY_STARTED: 'El turno ya comenzó y no se puede modificar.',
  WOD_CAPACITY_BELOW_BOOKINGS: 'El aforo no puede ser menor que los confirmados.',
  BOOKING_NOT_FOUND: 'No encontramos esa reserva.',
  BOOKING_ALREADY_EXISTS: 'Ya tenés una reserva en ese turno.',
  BOOKING_ALREADY_CANCELLED: 'La reserva ya estaba cancelada.',
  BOOKING_CANCELLATION_CLOSED: 'La ventana de cancelación está cerrada.',
  BOOKING_NOT_OWNER: 'No podés cancelar la reserva de otra persona.',
}

export const AUTH_CODES = new Set([
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_USER_INACTIVE',
])

export function getErrorMessage(code: string, fallback?: string): string {
  return MESSAGES[code] ?? fallback ?? `Error desconocido (${code}).`
}

export function detailsToFields(details: ApiErrorDetail[] = []): Record<string, string> {
  return details.reduce<Record<string, string>>((acc, detail) => {
    if (detail.field && !acc[detail.field]) acc[detail.field] = detail.message
    return acc
  }, {})
}

export function actionFailure(
  code: string,
  message: string,
  requestId?: string,
  details?: ApiErrorDetail[],
): ActionResult {
  return {
    ok: false,
    code,
    message,
    requestId,
    fields: detailsToFields(details),
  }
}
