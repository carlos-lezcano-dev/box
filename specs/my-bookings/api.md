# API — Mis reservas

**Contrato backend:** [`box-core/specs/bookings/api.md`](../../../box-core/specs/bookings/api.md)

---

## 1. Endpoints consumidos

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/bookings/me` | Listado propio |
| `DELETE` | `/bookings/:booking_id` | Cancelar reserva |

---

## 2. `GET /bookings/me`

### Response `200`

```ts
type MyBookingsResponse = {
  success: true
  data: Array<{
    booking_id: string
    wod_id: string
    user_id: string
    status: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED' | 'NOSHOW'
    booked_at: string
    confirmed_at: string | null
    promoted_at: string | null
    cancelled_at: string | null
    cancel_reason: string | null
    waitlist_position: number | null
    wod: {
      wod_id: string
      title: string
      description: string | null
      coach_id: string | null
      coach_full_name: string | null
      start_time: string
      end_time: string
      max_capacity: number
      available_slots: number
    }
  }>
}
```

> Si el contrato real del backend no anida `wod`, `src/api/bookings.ts` hace un `join` client-side usando `GET /wods/:id` (con memoización) y expone el mismo `BookingView`.

### Filtro local

```ts
const active = data.filter(
  (b) => b.status === 'CONFIRMED' || b.status === 'WAITLIST',
)
active.sort((a, b) => a.wod.start_time.localeCompare(b.wod.start_time))
```

---

## 3. `DELETE /bookings/:booking_id`

### Response `200`

```ts
type CancelBookingResponse = {
  success: true
  message: string
  data: {
    booking_id: string
    status: 'CANCELLED'
    promoted: boolean
    promoted_booking_id: string | null
  }
}
```

### Errores gestionados

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 401 | `AUTH_*` | Logout local + `/login` |
| 403 | `BOOKING_NOT_OWNER` | Error genérico; no revelar dueño |
| 404 | `BOOKING_NOT_FOUND` | Quitar ítem de la lista y recargar |
| 409 | `BOOKING_ALREADY_CANCELLED` | Recargar lista y avisar «Ya estaba cancelada» |
| 422 | `BOOKING_CANCELLATION_CLOSED` | Mantener ítem y mostrar cutoff |
| 429 | `RATE_LIMITED` | Mostrar segundos de `Retry-After` |

---

## 4. Notas de contrato

- `POST /bookings` usa `Idempotency-Key`; se documenta en [`classes/api.md`](../classes/api.md) porque la acción nace desde el explorador de clases.
- No se envía `user_id` en la cancelación: la autoría se resuelve con el token.
- `waitlist_position` puede ser `null` para reservas confirmadas; el mapper no debe mostrar `#null`.
- Tras cancelar, el estado local se actualiza optimistamente solo después de la respuesta exitosa (sin optimismo agresivo, porque la promoción la decide el backend).
