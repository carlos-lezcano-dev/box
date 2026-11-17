# API — Membresías y pagos (consumo desde frontend)

**Contrato backend:** [`box-core/specs/memberships/api.md`](../../../box-core/specs/memberships/api.md)

---

## 1. Endpoints consumidos

| Método | Ruta | Rol | Uso |
|--------|------|-----|-----|
| `GET` | `/memberships/me` | Todos | Chip de atleta y vista propia |
| `GET` | `/memberships` | ADMIN | Listado general de la vista administrativa |
| `POST` | `/memberships` | ADMIN | Registrar pago (F7) |
| `PATCH` | `/memberships/:membership_id/status` | ADMIN | Congelar/reactivar/cancelar (F7) |

---

## 2. `GET /memberships/me`

### Response `200`

```ts
type MembershipListResponse = {
  success: true
  data: Array<{
    membership_id: string
    user_id: string
    plan_name: string
    amount_paid: number
    start_date: string      // YYYY-MM-DD
    end_date: string        // YYYY-MM-DD
    status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
    payment_method: 'CASH' | 'TRANSFER' | 'CREDIT_CARD'
    notes: string | null
    created_by: string | null
    created_at: string
  }>
  meta: { page: number; limit: number; total: number; total_pages: number }
}
```

> La respuesta puede ser un único objeto en algunas versiones del contrato; el mapper de `src/api/memberships.ts` normaliza `data` a arreglo antes de pasar a la UI.

### Errores gestionados

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 401 | `AUTH_*` | Limpiar sesión y redirect `/login` |
| 403 | `AUTH_USER_INACTIVE` | Mostrar pantalla de cuenta inactiva |
| 429 | `RATE_LIMITED` | Mostrar segundos de `Retry-After` |
| 500 / 503 | `INTERNAL_ERROR` / `SERVICE_UNAVAILABLE` | Card con error + Reintentar |

---

## 3. Reglas de mapeo

| API | UI |
|-----|----|
| `plan_name` | Chip «Libre mensual» y texto principal de la card |
| `amount_paid` | `$6.240.000` |
| `status = ACTIVE` | Badge «Al día» |
| `end_date` | «Vigente hasta el 30/11» o «Vigente hasta hoy» |
| `payment_method` | Etiqueta opcional: `TRANSFER → 'Transferencia'` |
| `meta.total` | Contador de membresías del panel general (F3) |

No se muestran `user_id`, `created_by`, `notes` ni fechas técnicas `created_at`/`updated_at` en la vista de atleta.

---

## 4. Escritura (ADMIN)

`POST /memberships` acepta `Idempotency-Key` y requiere:

```ts
type CreateMembershipRequest = {
  user_id: string          // UUID
  plan_name: string        // 2–100
  amount_paid: number      // > 0, ≤ 2 decimales
  start_date: string       // YYYY-MM-DD
  end_date: string         // YYYY-MM-DD, ≥ start_date
  payment_method: 'CASH' | 'TRANSFER' | 'CREDIT_CARD'
  notes?: string
}
```

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Errores por `field` en el formulario |
| 403 | `AUTH_FORBIDDEN` | Redirect fuera de la vista admin |
| 404 | `USER_NOT_FOUND` | Error en el selector de atleta |
| 409 | `IDEMPOTENCY_CONFLICT` | Regenerar key y pedir confirmación |
| 422 | `MEMBERSHIP_INVALID_PERIOD` / `MEMBERSHIP_INVALID_AMOUNT` | Error de formulario |
| 429 | `RATE_LIMITED` | Mostrar `Retry-After` |

`PATCH /memberships/:id/status` acepta `ACTIVE` | `FROZEN` | `CANCELLED`; errores `MEMBERSHIP_INVALID_TRANSITION` y `MEMBERSHIP_NOT_FOUND`. La implementación de ambas acciones está en [`../admin/api.md`](../admin/api.md) (F7); esta spec solo fija el contrato y el mapper.

---

## 5. Métricas de la vista ADMIN

| Valor del diseño | Origen propuesto | Estado |
|------------------|------------------|--------|
| `130` | `meta.total` de `GET /memberships?status=ACTIVE&limit=1` | Hipótesis |
| `18` | `meta.total` con otro filtro de estado/vencimiento | Hipótesis |
| `130` | `meta.total` sin filtro | Hipótesis |
| `$6.240.000` | Suma de `amount_paid` del rango | Hipótesis |

> Los rótulos no se leyeron con OCR. No cablear ninguna de estas tarjetas hasta confirmarlas; ver [`../shared/design-reference.md`](../shared/design-reference.md).

---

## 6. Notas de contrato

- `created_by` es `null` para membresías de seed/migración.
- La moneda no viaja en la respuesta; se define en la capa de presentación (PYG).
- `EXPIRED` solo lo asigna el job diario del backend, nunca la API.
- Todas las lecturas autenticadas usan `cache: 'no-store'`.
