# Feature: Membresías y pagos

**Feature ID:** F4
**Carpeta de implementación:** `app/(app)/memberships/`, `src/components/features/memberships/`
**Requisitos:** RF-FE-05
**Depende de:** F1, F2
**Endpoint principal:** `GET /memberships/me`; `GET/POST /memberships` para ADMIN (F7)

---

## 1. Alcance

El diseño muestra la membresía de dos formas:

| Superficie | Texto / dato | Implementación |
|------------|--------------|----------------|
| Atleta (F5/F6) | `Libre mensual` | Chip en el encabezado, derivado de `GET /memberships/me` |
| ADMIN | `Membresías y pagos mensuales` | Título de la vista administrativa |
| ADMIN | `Vigencias claras. Cuentas al día.` | Subtítulo fijo |
| ADMIN | `130`, `18`, `130`, `$6.240.000` | Métricas de la vista; rótulos no legibles por OCR → hipótesis |
| ADMIN | `Registrar pago` | Acción que abre el formulario de alta de membresía |

**No incluye:** cobros online, facturación, reembolsos, pasarela de pago, planes con créditos ni edición de planes.

---

## 2. Actores

| Actor | Puede ver / hacer |
|-------|-------------------|
| `ATHLETE` / `COACH` | Sus propias membresías (`/memberships/me`) y el chip «Libre mensual» |
| `ADMIN` | Además, listado general, registro de pagos y cambio de estado (vista compartida con F7) |

---

## 3. Reglas de UX

| ID | Regla |
|----|-------|
| RN-FE-MEM-01 | La vista de atleta muestra primero la membresía `ACTIVE` con `end_date` más cercano; si hay varias vigentes, se elige la que vence antes. |
| RN-FE-MEM-02 | `end_date` es inclusivo: si es hoy, se muestra «Vigente hasta hoy», no «Vencida». |
| RN-FE-MEM-03 | Estado visual: `ACTIVE → 'Al día'`, `EXPIRED → 'Vencida'`, `FROZEN → 'Congelada'`, `CANCELLED → 'Cancelada'`. |
| RN-FE-MEM-04 | Si no hay membresías, mostrar «Todavía no registramos una membresía» con CTA a `/classes`. |
| RN-FE-MEM-05 | El importe se formatea como moneda local sin decimales: `$6.240.000`. |
| RN-FE-MEM-06 | El chip «Libre mensual» expone `plan_name`; si no hay activa, se oculta sin romper el encabezado. |
| RN-FE-MEM-07 | El componente `MembershipChip` es reutilizable por F5 y F6 y recibe props serializables. |
| RN-FE-MEM-08 | Nunca se muestran `user_id`, `created_by`, `notes` internas ni IDs en la vista de atleta. |
| RN-FE-MEM-09 | Si la membresía está por vencer (≤ 7 días), se muestra un aviso no bloqueante con `role="status"`. |
| RN-FE-MEM-10 | Las métricas `130` / `18` / `130` / `$6.240.000` se tratan como hipótesis: no se cablean hasta confirmar sus rótulos en `shared/design-reference.md`. |
| RN-FE-MEM-11 | «Registrar pago» abre el formulario con `Idempotency-Key` estable; solo `ADMIN` puede enviarlo. |

---

## 4. Modelo de vista

```ts
type MembershipView = {
  membership_id: string
  plan_name: string
  amount_paid: number
  start_date: string       // YYYY-MM-DD
  end_date: string         // YYYY-MM-DD
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
  payment_method: 'CASH' | 'TRANSFER' | 'CREDIT_CARD'
}
```

Derivados:

| Valor | Regla |
|-------|-------|
| `statusLabel` | Ver RN-FE-MEM-03 |
| `daysRemaining` | Diferencia inclusiva entre `end_date` y hoy en `America/Asuncion` |
| `isExpiringSoon` | `status === 'ACTIVE' && daysRemaining <= 7` |
| `formattedAmount` | `Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 })` |

---

## 5. Criterios de aceptación

```gherkin
Escenario: Chip de membresía en el explorador
  Dado un atleta con membresía "Libre mensual" activa
  Cuando abre /classes
  Entonces el encabezado muestra el chip "Libre mensual"

Escenario: Membresía vigente
  Dado un atleta con membresía "Libre mensual", 6240000, vigente hasta fin de mes
  Cuando abre /memberships
  Entonces ve "Libre mensual" y "$6.240.000" y el estado "Al día"

Escenario: Membresía que vence hoy
  Dado una membresía con end_date igual a hoy en America/Asuncion
  Cuando se renderiza
  Entonces se muestra "Vigente hasta hoy" y no como vencida

Escenario: Vista ADMIN
  Dado un ADMIN en /admin/memberships
  Cuando carga la vista
  Entonces ve "Membresías y pagos mensuales" y "Vigencias claras. Cuentas al día."
  Y ve la acción "Registrar pago"

Escenario: Sin membresía
  Dado un atleta sin membresías
  Cuando abre /memberships
  Entonces ve el estado vacío con CTA a /classes
  Y el chip del encabezado no se renderiza
```

---

## 6. Fuera de alcance

- Pago desde el frontend ni pasarela.
- Renovación automática.
- Historial de comprobantes / facturas electrónicas.
- Congelamiento automático por vacaciones.
- Asignar significado a las métricas del diseño sin confirmación.
