# API — Explorar y reservar clases

**Contrato backend:** [`box-core/specs/wods/api.md`](../../../box-core/specs/wods/api.md) y [`box-core/specs/bookings/api.md`](../../../box-core/specs/bookings/api.md)

---

## 1. Endpoints consumidos

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/wods?from=<iso>&to=<iso>` | Agenda del rango |
| `GET` | `/wods/:wod_id` | Detalle de una clase (opcional) |
| `GET` | `/memberships/me` | Validar membresía vigente (viene de F4) |
| `POST` | `/bookings` | Reservar o entrar en waitlist |

---

## 2. `GET /wods`

### Query

| Parámetro | Regla |
|-----------|-------|
| `from` | ISO-8601 UTC con `Z`, inicio del día en `America/Asuncion` convertido a UTC |
| `to` | ISO-8601 UTC con `Z`, máximo `from + 31 días` |
| `coach_id` | Filtro opcional por coach (UUID) |
| `page` / `limit` | 1 / 20 (1–100) |
| Default | hoy → hoy + 7 días (la captura muestra `Hoy, 27` → `01`) |

### Response `200`

```ts
type WodsResponse = {
  success: true
  data: Array<{
    wod_id: string
    coach_id: string | null
    title: string
    description: string | null
    start_time: string   // ISO UTC con Z
    end_time: string     // ISO UTC con Z
    max_capacity: number
    confirmed_count: number
    available_slots: number
    waitlist_count: number
    created_at: string
  }>
}
```

---

## 3. `POST /bookings`

### Request

```ts
type CreateBookingRequest = {
  wod_id: string
}
```

Headers:

```
Authorization: Bearer <token>   // lo agrega src/api/client.ts
Idempotency-Key: <uuid>         // estable por intención de reserva
Content-Type: application/json
```

### Respuestas

| Situación | HTTP | Body resumido |
|-----------|------|---------------|
| Con cupo | `201` | `{ success: true, status: 'CONFIRMED', data: { booking_id, status: 'CONFIRMED', available_slots } }` |
| Sin cupo | `200` | `{ success: true, status: 'WAITLIST', data: { booking_id, status: 'WAITLIST', waitlist_position } }` |

> Excepción deliberada del backend (D-07): `200` para `WAITLIST`, `201` para `CONFIRMED`. El cliente no asume que toda respuesta 2xx es confirmación.

### Errores gestionados

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Error de formulario /Ids inválidos |
| 403 | `MEMBERSHIP_REQUIRED` | Aviso + CTA a `/memberships` |
| 403 | `AUTH_USER_INACTIVE` | Pantalla de cuenta inactiva |
| 404 | `WOD_NOT_FOUND` | Quitar tarjeta y recargar agenda |
| 409 | `WOD_ALREADY_STARTED` | Deshabilitar botón y avisar |
| 409 | `BOOKING_ALREADY_EXISTS` | Mostrar posición si viene en `details`/`data` y CTA a `/bookings` |
| 409 | `IDEMPOTENCY_CONFLICT` | Regenerar key y pedir confirmación al usuario |
| 429 | `RATE_LIMITED` | Mostrar `Retry-After` |

---

## 4. Idempotencia en el cliente

```ts
const key = useMemo(() => crypto.randomUUID(), [wod.wod_id, intentVersion])
await api.post('/bookings', { wod_id: wod.wod_id }, { idempotencyKey: key })
```

- Se genera una vez por tarjeta/intención.
- Se reutiliza si la request falla por red y el usuario reintenta.
- Se regenera solo cuando el usuario cambia de turno o confirma un `IDEMPOTENCY_CONFLICT`.

---

## 5. Notas de zona horaria

- El backend transporta UTC siempre.
- `from`/`to` se calculan con `America/Asuncion` y se convierten a ISO con `Z`.
- La presentación de `19:00` y `Hoy, 19:00` usa el mismo helper que F5 (`src/lib/datetime.ts`).
- El chip «Libre mensual» del encabezado viene de `GET /memberships/me` (F4); no se pide aquí.
- `WodResponseDto` no trae `coach_full_name`: si la tarjeta lo muestra, resolverlo con `GET /users/:coach_id` u ocultarlo. La gestión de turnos está en [`../admin/api.md`](../admin/api.md) (F7).

---

## 6. Revalidación

Tras `POST /bookings` exitoso:

```ts
revalidateTag('wods')     // si se implementa caché con tags en el cliente HTTP
router.refresh()          // rehydra Server Components de agenda, bookings y dashboard
```

Si no se usa caché con tags (configuración inicial con `no-store`), basta `router.refresh()`.
