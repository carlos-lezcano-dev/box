# API — Panel general

**Contratos relacionados:** [`box-core/specs/users/api.md`](../../../box-core/specs/users/api.md), [`box-core/specs/memberships/api.md`](../../../box-core/specs/memberships/api.md), [`box-core/specs/wods/api.md`](../../../box-core/specs/wods/api.md)

---

## 1. Endpoints consumidos

| Método | Ruta | Uso | Cache |
|--------|------|-----|-------|
| `GET` | `/users?role=ATHLETE&limit=1` | `meta.total` → total de atletas | `no-store` |
| `GET` | `/memberships?limit=1` | `meta.total` → total de membresías | `no-store` |
| `GET` | `/wods?from&to&limit=5` | Próximos turnos del panel | `no-store` |

> `/users` y `/memberships` (listado general) son exclusivos de `ADMIN`. Por eso `app/(app)/page.tsx` solo monta el panel para ADMIN y redirige a otros roles. El backend sigue siendo la autoridad.

---

## 2. Agregaciones

```ts
type PanelGeneralMetrics = {
  totalAthletes: number | null
  totalMemberships: number | null
  collectedAmount: number | null
  nextWods: Array<{
    wod_id: string
    title: string
    start_time: string
    coach_full_name: string | null
    available_slots: number
  }>
}
```

| Métrica del diseño | Origen | Estado |
|--------------------|--------|--------|
| `148` | `meta.total` de `/users?role=ATHLETE&limit=1` | Confirmado como total de atletas |
| `18 membresías` | `meta.total` de `/memberships?limit=1` | Confirmado como total de membresías |
| `$6.240.000` | Suma de `amount_paid` de `/memberships` | **Hipótesis**: la respuesta está paginada; requiere confirmar si el diseño muestra recaudación o importe de una membresía |
| `10:00`, `12:30`, `18:00` | `start_time` de `/wods` convertido a `America/Asuncion` | Confirmado como próximos turnos |
| `86`, `72%`, `76%`, `10:12` | Sin endpoint identificado | **No cablear** hasta confirmar significado |

---

## 3. Mapeo de respuesta

```ts
type PaginatedResponse<T> = {
  success: true
  data: T[]
  meta: { page: number; limit: number; total: number; total_pages: number }
}
```

- `data.length` **nunca** se usa como total: con `limit=1` siempre sería 1.
- `WodResponseDto` no incluye `coach_full_name`; si el diseño exige el nombre del coach, resolverlo con `GET /users/:coach_id` (ADMIN) o dejar `null` y ocultar el campo.
- `available_slots` y `confirmed_count` llegan calculados desde PostgreSQL; la UI no los estima.

---

## 4. Errores gestionados

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | No debería ocurrir con queries fijas; registrar `request_id` |
| 401 | `AUTH_*` | Limpiar cookie y redirect `/login?next=/` |
| 403 | `AUTH_FORBIDDEN` | Pantalla «Acceso restringido»; el page ya redirigió a roles no ADMIN antes de pedir datos |
| 429 | `RATE_LIMITED` | Tarjeta con mensaje y `Retry-After` |
| 500 / 503 | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | Error local por tarjeta con «Reintentar» |

---

## 5. Formato y zonas

| Dato | Formato |
|------|---------|
| Importe | `Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 })` → `$6.240.000` |
| Hora de turno | `Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit' })` |
| `from`/`to` | ISO-8601 UTC calculado desde `America/Asuncion`, rango ≤ 31 días |

---

## 6. Notas

- El panel no introduce endpoints nuevos: compone los contratos existentes.
- `from`/`to` se envían con `Z`; el backend rechaza fechas sin zona.
- Las lecturas autenticadas usan `cache: 'no-store'`.
- Si una petición falla, se degrada solo su tarjeta; nunca se lanza un error global que tape el panel.
