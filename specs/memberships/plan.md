# Plan de implementación — Membresías y pagos

**Feature ID:** F4
**Estado:** completo
**Estimación:** 1 día
**Precondición:** F1, F2 y Fase 0 (cliente API, formateo)

---

## 1. Archivos a crear

```
app/(app)/memberships/page.tsx
app/(app)/memberships/loading.tsx
src/api/memberships.ts
src/components/features/memberships/membership-chip.tsx
src/components/features/memberships/membership-summary-card.tsx
src/components/features/memberships/membership-status-badge.tsx
src/components/features/memberships/membership-empty-state.tsx
src/lib/membership-view.ts
src/lib/membership-view.spec.ts
tests/e2e/memberships.spec.ts
```

> La vista administrativa («Registrar pago», listado y métricas) se implementa en F7; F4 aporta el contrato, el mapper y el chip reutilizable.

---

## 2. Tareas

### 2.1 Datos

- [x] `src/api/memberships.ts`: `getMyMemberships()` y `getMemberships()` con `cache: 'no-store'` y normalización `data` → arreglo.
- [x] `src/lib/membership-view.ts`: `toMembershipView()`, `pickCurrent()`, `getDaysRemaining()`, `getStatusLabel()`.
- [x] `pickCurrent()` prioriza `ACTIVE`, luego `end_date` más cercano; si no hay activas, devuelve la más reciente.
- [x] Exponer `hasActiveMembership` y `planName` para el chip del encabezado.

### 2.2 UI de atleta

- [x] `MembershipChip` muestra `plan_name` («Libre mensual») y se inyecta en F5 y F6 desde el layout.
- [x] Si no hay membresía activa, el chip se oculta sin afectar el encabezado.
- [x] `page.tsx` renderiza plan, importe formateado, estado, vigencia y aviso de vencimiento próximo.
- [x] `MembershipEmptyState` con CTA a `/classes`.
- [x] La card no muestra IDs, `notes` internas ni `created_by`.

### 2.3 Vista ADMIN (contrato compartido con F7)

- [x] `getMemberships({ status, from, to, page, limit })` con `meta.total`.
- [x] Copy fijo «Membresías y pagos mensuales» / «Vigencias claras. Cuentas al día.».
- [x] Acción «Registrar pago» con `Idempotency-Key` estable por intención.
- [x] No renderizar tarjetas para las métricas `130`/`18`/`$6.240.000` hasta confirmar sus rótulos.

### 2.4 Estados y responsive

- [x] `loading.tsx` con skeleton de la card y del chip.
- [x] Error local con `role="alert"` y botón «Reintentar».
- [x] Card apilada en móvil, ancho completo; en desktop comparte grid con el resto del contenido.
- [x] Contraste del badge de estado verificado.

---

## 3. Pruebas

- [x] `getDaysRemaining('2026-11-30', '2026-11-17') === 13`.
- [x] `getDaysRemaining('2026-11-17', '2026-11-17') === 0` → «Vigente hasta hoy».
- [x] `getStatusLabel` para los cuatro estados.
- [x] `pickCurrent()` elige la ACTIVE con `end_date` más próximo.
- [x] `formatCurrency(6240000) === '$6.240.000'`.
- [x] `MembershipChip` se oculta con `planName` nulo.
- [x] E2E: chip «Libre mensual» visible en `/classes` y `/bookings`.
- [x] E2E: plan e importe exactos del diseño en `/memberships`.
- [x] E2E: membresía vencida no muestra badge «Al día».

---

## 4. Definition of Done

- [x] Chip reutilizable por F5 y F6 con props serializables.
- [x] Importe con formato `es-PY` / PYG.
- [x] `end_date` inclusivo implementado.
- [x] Cuatro estados de UI.
- [x] Contrato de escritura ADMIN documentado y consumido por F7.
- [x] Métricas no confirmadas ausentes del DOM.
- [x] `npm run lint` y `npm run build` en verde.

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `GET /memberships/me` devuelve objeto en vez de array | Normalizador en `src/api/memberships.ts` |
| Varias membresías activas solapadas | Regla RN-FE-MEM-01 explícita |
| Diferencia de días dependiente del reloj del servidor | Helper con zona `America/Asuncion` y fecha inyectable en tests |
| Métricas del diseño se interpreten mal | Tarjetas omitidas hasta confirmar rótulos en `design-reference.md` |
| Chip cargue tarde en F5/F6 | Resolverse en el layout y pasarse como prop serializable |
