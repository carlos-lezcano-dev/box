# API — Administración

**Contratos backend:** [`users/api.md`](../../../box-core/specs/users/api.md), [`wods/api.md`](../../../box-core/specs/wods/api.md), [`bookings/api.md`](../../../box-core/specs/bookings/api.md) y [`memberships/api.md`](../../../box-core/specs/memberships/api.md)
**Base URL:** `/api/v1`
**Autenticación:** JWT Bearer en todos los endpoints. `POST /users/register` es público en el contrato, pero F7 lo llama con token ADMIN para poder enviar `role`.

---

## 1. Envelope y reglas globales

```ts
type SuccessEnvelope<T> = {
  success: true
  data: T
  meta?: { page: number; limit: number; total: number; total_pages: number }
  message?: string
  status?: string // devuelto en la raíz por /bookings (CONFIRMED | WAITLIST)
}

type ErrorEnvelope = {
  success: false
  error: {
    code: string
    message: string
    details?: Array<{ field: string; rule: string; message: string }>
  }
  request_id: string // solo en errores; nunca en respuestas exitosas
}
```

Detalles confirmados contra el código real de `box-core`:

- `meta` solo aparece en listados paginados; `meta.total_pages === 0` cuando `total === 0` (no 1).
- `message` (y opcionalmente `status` en raíz) solo aparece cuando el handler usa `withMessage()`.
- `request_id` también se devuelve como cabecera `X-Request-Id`; el cliente puede enviar esa cabecera con un valor `^[A-Za-z0-9._-]{8,128}$` para correlacionar.

Reglas del cliente:

1. El cliente HTTP antepone `/api/v1`, serializa JSON y adjunta `Authorization: Bearer <token>` desde la cookie de sesión leída en servidor.
2. Si `!response.ok` o `success === false`, se lanza `ApiError` con `code`, `status`, `message`, `details` y `request_id`.
3. La UI compara **siempre** `error.code`, nunca el texto de `message`.
4. `request_id` se muestra junto al error (texto pequeño o botón de copiado) para soporte.
5. Toda lectura autenticada usa `cache: 'no-store'`; no se mezcla con `revalidate`.
6. Ningún componente llama a `fetch` directo: las funciones viven en `src/api/admin-*.ts`.
7. Tras una escritura exitosa basta `router.refresh()`, porque no hay caché persistente.
8. La paginación deshabilita «siguiente» con `page >= meta.total_pages` **o** `meta.total_pages === 0`.

---

## 2. Matriz de endpoints por pantalla

| Método | Ruta | Rol | Pantalla F7 | Uso |
|--------|------|-----|-------------|-----|
| `GET` | `/users` | ADMIN | Usuarios / hub | Listado, métricas y selector de coaches |
| `GET` | `/users/:user_id` | ADMIN | Usuarios | Detalle opcional de una persona |
| `POST` | `/users/register` | Público / ADMIN | Usuarios | `+ Nuevo`; F7 envía `role` |
| `GET` | `/users/me` | Todos | Shell F2 | Perfil del administrador; F7 no lo vuelve a pedir |
| `GET` | `/wods` | Todos | Agenda | Turnos del rango semanal |
| `POST` | `/wods` | COACH, ADMIN | Agenda | `Crear turno` |
| `GET` | `/wods/:wod_id` | Todos | Detalle | Cabecera del turno y aforo |
| `PATCH` | `/wods/:wod_id` | COACH propio, ADMIN | Detalle | Editar turno |
| `DELETE` | `/wods/:wod_id` | ADMIN | Detalle | Cancelar turno |
| `GET` | `/wods/:wod_id/bookings` | ADMIN, COACH asignado | Detalle | Participantes y lista de espera |
| `DELETE` | `/bookings/:booking_id` | Dueño, ADMIN | Detalle | Cancelar reserva ajena |
| `GET` | `/memberships` | ADMIN | Membresías ADMIN | Listado y filtros |
| `POST` | `/memberships` | ADMIN | Membresías ADMIN | `Registrar pago` |
| `PATCH` | `/memberships/:membership_id/status` | ADMIN | Membresías ADMIN | Congelar, reactivar o cancelar |

> `GET /memberships/me` pertenece a F4. F7 no lo consume en la subvista administrativa.

---

## 3. Usuarios

### 3.1 `GET /users`

#### Query

| Parámetro | Default | Regla |
|-----------|---------|-------|
| `page` | `1` | ≥ 1 |
| `limit` | `20` | 1–100 |
| `role` | — | `ATHLETE` \| `COACH` \| `ADMIN` |
| `is_active` | — | `true` \| `false` |
| `q` | — | 1–100 caracteres; ILIKE sobre `email` y `full_name` |
| `sort` | `created_at` | `created_at` \| `full_name` \| `email` |
| `order` | `desc` | `asc` \| `desc` |

#### Response `200`

```ts
type UsersResponse = {
  success: true
  data: Array<{
    user_id: string
    email: string
    full_name: string
    phone: string | null
    emergency_contact: string | null
    role: 'ATHLETE' | 'COACH' | 'ADMIN'
    is_active: boolean
    created_at: string // ISO UTC
  }>
  meta: { page: number; limit: number; total: number; total_pages: number }
}
```

> `is_active` admite `"true"`, `"false"`, `"1"` y `"0"`. El listado desempata por `user_id asc`. `meta.total_pages` es `0` si `total === 0`.

> El DTO no expone `updated_at`. Por eso «Hoy, 09:12» se deriva de `created_at` y se rotula «Alta» como hipótesis.

#### Métricas `156 / 148 / 6 / 2`

```ts
const [all, athletes, coaches, admins] = await Promise.all([
  api.get('/users', { query: { page: 1, limit: 1 } }),
  api.get('/users', { query: { page: 1, limit: 1, role: 'ATHLETE' } }),
  api.get('/users', { query: { page: 1, limit: 1, role: 'COACH' } }),
  api.get('/users', { query: { page: 1, limit: 1, role: 'ADMIN' } }),
])

return {
  todos: all.meta.total,
  atletas: athletes.meta.total,
  entrenadores: coaches.meta.total,
  administradores: admins.meta.total,
}
```

No se aplica `is_active` en estas cuatro consultas salvo confirmación del diseño. La etiqueta «Entrenadores» corresponde a `role=COACH`.

#### Errores

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Corregir filtros (`sort`, `limit`, `role`) |
| 401 | `AUTH_*` | Limpiar sesión y redirect `/login` |
| 403 | `AUTH_FORBIDDEN` | Pantalla «Acceso restringido» |
| 500 / 503 | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | Error con `request_id` + «Reintentar» |

### 3.2 `GET /users/:user_id`

- Path param: UUID v4.
- Response `200`: el mismo `UserResponseDto`.
- Errores: `VALIDATION_ERROR` (400), `AUTH_*` (401), `AUTH_FORBIDDEN` (403), `USER_NOT_FOUND` (404).

### 3.3 `POST /users/register` desde ADMIN

#### Request

```ts
type RegisterUserRequest = {
  email: string
  password: string       // 10–72, ≥ 1 letra y ≥ 1 dígito
  full_name: string      // 2–150
  phone?: string         // E.164 o 7–15 dígitos
  emergency_contact?: string
  role?: 'ATHLETE' | 'COACH' | 'ADMIN' // solo se envía cuando el emisor es ADMIN
}
```

Headers: `Content-Type: application/json` y, desde F7, `Authorization: Bearer <token>`. Respuesta `201`: el `UserResponseDto` creado. **No emite token**: el flujo es alta → refresco del listado, sin login automático.

#### Errores

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Marcar campos desde `error.details[].field` |
| 403 | `USER_ROLE_NOT_ALLOWED` / `AUTH_FORBIDDEN` | Acceso restringido; no reintentar con otro `role` |
| 409 | `USER_EMAIL_TAKEN` | Error en `email` con copy concreto |
| 429 | `RATE_LIMITED` | Deshabilitar envío y mostrar segundos de `Retry-After` |
| 500 | `INTERNAL_ERROR` | `request_id` + «Reintentar» |

---

## 4. Turnos (WODs)

### 4.1 `GET /wods`

| Parámetro | Default | Regla |
|-----------|---------|-------|
| `from` | hoy 00:00 en `America/Asuncion` | ISO-8601 UTC con `Z` |
| `to` | `from + 7 días` | ISO UTC; **`to` exclusivo** (`start_time >= from AND start_time < to`); rango ≤ 31 días |
| `coach_id` | — | UUID |
| `page` / `limit` | `1` / `20` | 1–100 |

Si se envía solo `from`, el backend calcula `to = from + 7 × 24 h`. Si se envía solo `to`, `from = hoy 00:00` en `America/Asuncion`. Un rango > 31 días responde **400 `VALIDATION_ERROR`** con `details: [{ field: 'to', rule: 'range' }]`. El validador acepta `Z` u offset `±HH:MM`, pero el frontend siempre envía `.toISOString()` con `Z`.

```ts
type AdminWodsResponse = {
  success: true
  data: Array<{
    wod_id: string
    coach_id: string | null
    title: string
    description: string | null
    start_time: string
    end_time: string
    max_capacity: number
    confirmed_count: number
    available_slots: number
    waitlist_count: number
    created_at: string
  }>
  meta: { page: number; limit: number; total: number; total_pages: number }
}
```

> `coach_full_name` no viene en el DTO de `/wods`. Se obtiene desde `GET /users` o desde el roster cuando hace falta mostrar «Carolina Molina».

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Corregir filtros; si `details[].field === 'to'` y `rule === 'range'`, acortar el rango a ≤ 31 días |
| 401 | `AUTH_*` | Limpiar sesión y redirect `/login` |
| 429 | `RATE_LIMITED` | Mostrar `Retry-After` |

> Como `to` es exclusivo, la agenda lunes → viernes debe enviar `to = sábado 00:00` en `America/Asuncion` (o el instante inmediatamente posterior al último turno del viernes). Enviar `to = viernes 00:00` excluiría todo el viernes.

### 4.2 Selector de coach

`GET /users?is_active=true&limit=100&role=COACH` y `GET /users?is_active=true&limit=100&role=ADMIN` en paralelo. El backend admite ambos roles como coach. Si no se elige nadie, `coach_id` se omite en `POST /wods` y la UI muestra «Sin asignar».

### 4.3 `POST /wods`

```ts
type CreateWodRequest = {
  title: string            // 3–150
  description?: string     // ≤ 2 000
  start_time: string       // ISO UTC, futuro
  end_time: string         // ISO UTC, 15 min–6 h después de start_time
  max_capacity?: number    // 1–100, default 15
  coach_id?: string        // UUID de COACH/ADMIN activo
}
```

Respuesta `201` con `WodResponseDto`.

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Errores de formulario |
| 401 | `AUTH_*` | Redirect `/login` |
| 403 | `AUTH_FORBIDDEN` | Acceso restringido |
| 422 | `WOD_INVALID_TIME_RANGE` | Avisar duración/orden de horarios |
| 422 | `WOD_START_IN_PAST` | Avisar que el inicio debe ser futuro |
| 422 | `WOD_COACH_INVALID` | Marcar el selector de coach |
| 429 | `RATE_LIMITED` | Mostrar `Retry-After` |

### 4.4 `GET /wods/:wod_id`

- Respuesta `200`: `WodResponseDto` con conteos actualizados.
- Errores: `VALIDATION_ERROR` (400), `AUTH_*` (401), `WOD_NOT_FOUND` (404).

### 4.5 `PATCH /wods/:wod_id`

Body parcial: `coach_id` (UUID \| `null`; solo ADMIN lo cambia), `title`, `description`, `start_time`, `end_time`, `max_capacity`. Campos omitidos no se modifican.

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Corregir valores |
| 403 | `AUTH_FORBIDDEN` | Acceso restringido |
| 404 | `WOD_NOT_FOUND` | Cerrar detalle y volver a la agenda |
| 409 | `WOD_ALREADY_STARTED` | Deshabilitar edición del turno |
| 409 | `WOD_CAPACITY_BELOW_BOOKINGS` | Mostrar `confirmed_count` y sugerir aforo mínimo |
| 422 | `WOD_INVALID_TIME_RANGE` / `WOD_START_IN_PAST` / `WOD_COACH_INVALID` | Marcar el campo correspondiente |

### 4.6 `DELETE /wods/:wod_id`

```ts
type CancelWodResponse = {
  success: true
  message: string
  data: { wod_id: string; cancelled_bookings: number }
}
```

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | UUID inválido |
| 403 | `AUTH_FORBIDDEN` | No ADMIN |
| 404 | `WOD_NOT_FOUND` | Volver a la agenda |
| 409 | `WOD_ALREADY_STARTED` | No se puede cancelar un turno iniciado |

---

## 5. Detalle, participantes y lista de espera

### 5.1 `GET /wods/:wod_id/bookings`

Solo ADMIN o el COACH asignado al turno.

```ts
type RosterResponse = {
  success: true
  data: {
    wod_id: string
    max_capacity: number
    confirmed_count: number
    waitlist_count: number
    confirmed: Array<{
      booking_id: string
      user_id: string
      full_name: string
      booked_at: string
      promoted_at: string | null
    }>
    waitlist: Array<{
      booking_id: string
      user_id: string
      full_name: string
      booked_at: string
      position: number
    }>
  }
}
```

Mapeo a la captura:

| API | UI |
|-----|----|
| `confirmed_count` / `max_capacity` | `AFORO 12/12` |
| `confirmed[].full_name` | Sección «Participantes» + iniciales derivadas |
| `waitlist_count` | «3 atletas» (hipótesis) |
| `waitlist[].position` | Orden de la «Lista de espera» |
| `data.wod_id` | No se muestra como texto |

Errores: `VALIDATION_ERROR` (400), `AUTH_*` (401), `AUTH_FORBIDDEN` (403), `WOD_NOT_FOUND` (404).

> La posición puede bajar si alguien cancela por delante. No se guarda en caché: se vuelve a pedir el roster tras cada cancelación.

### 5.2 `DELETE /bookings/:booking_id`

ADMIN puede cancelar la reserva de otra persona. Requiere confirmación previa en la UI.

```ts
type CancelBookingResponse = {
  success: true
  message: string
  data: {
    booking_id: string
    status: 'CANCELLED'
    cancelled_at: string
    promoted: boolean
    promoted_user_id: string | null
  }
}
```

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | UUID inválido |
| 401 | `AUTH_*` | Redirect `/login` |
| 403 | `BOOKING_NOT_OWNER` / `AUTH_FORBIDDEN` | Acceso restringido |
| 404 | `BOOKING_NOT_FOUND` | Quitar la fila y refrescar |
| 409 | `BOOKING_ALREADY_CANCELLED` | Refrescar roster y avisar |
| 422 | `BOOKING_CANCELLATION_CLOSED` | Avisar ventana de cancelación cerrada |

Si `promoted === true`, aviso `role="status"`: «Se promovió a la siguiente persona de la lista de espera».

---

## 6. Membresías ADMIN

### 6.1 `GET /memberships`

| Parámetro | Default | Regla |
|-----------|---------|-------|
| `user_id` | — | UUID |
| `status` | — | `ACTIVE` \| `EXPIRED` \| `FROZEN` \| `CANCELLED` |
| `from` | — | `YYYY-MM-DD`; filtra `end_date >= from` |
| `to` | — | `YYYY-MM-DD`; filtra `end_date <= to` |
| `page` / `limit` | `1` / `20` | 1–100 |
| `sort` | `created_at` | `created_at` \| `end_date` \| `amount_paid` |
| `order` | `desc` | `asc` \| `desc` |

```ts
type AdminMembershipsResponse = {
  success: true
  data: Array<{
    membership_id: string
    user_id: string
    plan_name: string
    amount_paid: number
    start_date: string // YYYY-MM-DD
    end_date: string   // YYYY-MM-DD, inclusivo
    status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
    payment_method: 'CASH' | 'TRANSFER' | 'CREDIT_CARD'
    notes: string | null
    created_by: string | null
    created_at: string
  }>
  meta: { page: number; limit: number; total: number; total_pages: number }
}
```

Errores: `VALIDATION_ERROR` (400), `AUTH_*` (401), `AUTH_FORBIDDEN` (403).

### 6.2 `POST /memberships` — «Registrar pago»

```ts
type CreateMembershipRequest = {
  user_id: string          // UUID
  plan_name: string        // 2–100
  amount_paid: number      // > 0, ≤ 1 000 000, ≤ 2 decimales
  start_date: string       // YYYY-MM-DD
  end_date: string         // ≥ start_date
  payment_method: 'CASH' | 'TRANSFER' | 'CREDIT_CARD'
  notes?: string           // ≤ 1 000
}
```

Headers:

```
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: <uuid>
```

**Confirmación contra el código real:** `Idempotency-Key` es **opcional** en el backend (`@ApiHeader({ required: false })`). El frontend la envía siempre porque es la única forma de deduplicar, pero **no debe esperar un 400 por omitirla**. El 409 `IDEMPOTENCY_CONFLICT` solo aparece si la misma clave se reutiliza con un body distinto.

La clave se genera al abrir el diálogo y se reutiliza en reintentos de red. Se regenera solo si el usuario cambia el body o confirma un `IDEMPOTENCY_CONFLICT`.

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Errores por `details[].field`; si es `amount_paid`, corregir el importe |
| 401 | `AUTH_*` | Redirect `/login` |
| 403 | `AUTH_FORBIDDEN` | Acceso restringido |
| 404 | `USER_NOT_FOUND` | Marcar el selector de atleta |
| 409 | `IDEMPOTENCY_CONFLICT` | Pedir confirmación y regenerar clave |
| 422 | `MEMBERSHIP_INVALID_PERIOD` | Corregir rango de fechas |
| 429 | `RATE_LIMITED` | Mostrar `Retry-After` |

> `MEMBERSHIP_INVALID_AMOUNT` (422) existe en el catálogo del backend como defensa en profundidad, pero el DTO valida `amount_paid` antes (`> 0`, `≤ 1 000 000`, `≤ 2` decimales). Por HTTP llega **400 `VALIDATION_ERROR`** con `details[].field === 'amount_paid'`. El formulario debe manejar ambos códigos; el que realmente se verá es el 400.

> El diseño muestra `$6.240.000`, pero el contrato limita cada registro a `1 000 000`. No se precarga ese valor en `amount_paid`.

### 6.3 `PATCH /memberships/:membership_id/status`

Body: `{ "status": "ACTIVE" | "FROZEN" | "CANCELLED" }`.

| Desde | Hacia | Resultado |
|-------|-------|-----------|
| `ACTIVE` | `FROZEN` | Permitido |
| `ACTIVE` | `CANCELLED` | Permitido |
| `FROZEN` | `ACTIVE` | Permitido |
| `FROZEN` | `CANCELLED` | Permitido |
| `EXPIRED` | cualquiera | `MEMBERSHIP_INVALID_TRANSITION` |
| `CANCELLED` | cualquiera | `MEMBERSHIP_INVALID_TRANSITION` |
| `ACTIVE` | `EXPIRED` | No se ofrece: `EXPIRED` lo asigna el job |

Errores: `VALIDATION_ERROR` (400), `AUTH_*` (401), `AUTH_FORBIDDEN` (403), `MEMBERSHIP_NOT_FOUND` (404), `MEMBERSHIP_INVALID_TRANSITION` (409).

---

## 7. Errores globales y revalidación

| Situación | `code` | Acción transversal |
|-----------|--------|--------------------|
| Sesión inválida | `AUTH_TOKEN_MISSING`, `AUTH_TOKEN_INVALID`, `AUTH_TOKEN_EXPIRED` | Limpiar cookie y `redirect('/login')` |
| Usuario inactivo | `AUTH_USER_INACTIVE` | Pantalla de cuenta inactiva |
| Sin permisos | `AUTH_FORBIDDEN`, `USER_ROLE_NOT_ALLOWED` | «Acceso restringido»; no redirect a login |
| No encontrado | `USER_NOT_FOUND`, `WOD_NOT_FOUND`, `BOOKING_NOT_FOUND`, `MEMBERSHIP_NOT_FOUND` | Quitar fila o cerrar detalle y refrescar |
| Conflicto | `USER_EMAIL_TAKEN`, `BOOKING_ALREADY_CANCELLED`, `WOD_ALREADY_STARTED`, `WOD_CAPACITY_BELOW_BOOKINGS`, `MEMBERSHIP_INVALID_TRANSITION`, `IDEMPOTENCY_CONFLICT` | Acción específica por pantalla |
| Validación / regla de negocio | `VALIDATION_ERROR` (incluye importe inválido y rango > 31 días), `WOD_INVALID_TIME_RANGE`, `WOD_START_IN_PAST`, `WOD_COACH_INVALID`, `MEMBERSHIP_INVALID_PERIOD` | Mensaje en el campo correspondiente; `MEMBERSHIP_INVALID_AMOUNT` se acepta por robustez pero no llega por HTTP |
| Límite | `RATE_LIMITED` | Deshabilitar acción y mostrar `Retry-After` |
| Caída del servicio | `INTERNAL_ERROR`, `SERVICE_UNAVAILABLE` | `role="alert"` con `request_id` y «Reintentar» |

Tras cualquier escritura exitosa: `router.refresh()`. Como las lecturas son `no-store`, no hacen falta `revalidateTag`.

---

## 8. Zona horaria, idempotencia y pendientes

- Transporte: todo datetime viaja en ISO UTC con `Z`. Fechas de membresía son `YYYY-MM-DD` sin hora. El backend acepta offsets `±HH:MM`, pero el frontend siempre envía `.toISOString()`.
- Presentación: `Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', ... })` mediante los helpers de F6.
- `from`/`to` de WODs se calculan en `America/Asuncion` y se convierten a UTC antes de enviarlos. `to` es exclusivo, así que la agenda semanal envía el sábado `00:00` como `to`.
- `from`/`to` de membresías filtran `end_date` de forma inclusiva, no la fecha de pago.
- `Idempotency-Key`: el backend la trata como opcional en `POST /memberships`; F7 la envía siempre para deduplicar. `POST /bookings` no se usa en F7 (solo se cancelan reservas).
- `POST /users/register` es `@OptionalAuth()`: un token expirado adjunto provoca 401. El cliente de F7 no debe reenviar la cookie de sesión en esa llamada, o debe renovarla antes.
- RBAC real: solo son ADMIN-only `GET /users`, `GET /users/:id`, `DELETE /wods/:id` y `GET/POST/PATCH /memberships`. `GET /wods`, `GET /wods/:id` y `GET /bookings/me` están disponibles para cualquier usuario autenticado. El bloqueo de F7 para ATHLETE es del layout, no un 403 universal del backend.
- Pendiente de confirmar: significado de las cuatro métricas de membresías, origen de «Sala principal», taxonomía de «Tipo: todos», destino de «Ver vencidas» y correspondencia entre iniciales y nombres del OCR.
