# Plan de implementación — Explorar y reservar clases

**Feature ID:** F6
**Estado:** completo
**Estimación:** 2 días
**Precondición:** F1, F2, F4 y F5 (para feedback y estado de reservas)

---

## 1. Archivos a crear

```
app/(app)/classes/page.tsx
app/(app)/classes/loading.tsx
src/api/wods.ts
src/components/features/classes/class-date-filter.tsx
src/components/features/classes/class-card.tsx
src/components/features/classes/class-list.tsx
src/components/features/classes/book-button.tsx
src/components/features/classes/booking-toast.tsx
src/hooks/use-book-action.ts
src/lib/class-view.ts
src/lib/datetime.ts
src/lib/datetime.spec.ts
src/lib/class-view.spec.ts
tests/e2e/classes.spec.ts
```

---

## 2. Tareas

### 2.1 Agenda

- [x] `src/api/wods.ts`: `getWods({ from, to })` con `cache: 'no-store'`.
- [x] `src/lib/datetime.ts`: `boxToday()`, `toUtcIso()`, `formatSlotTime()` y `formatDayLabel()` con `timeZone: 'America/Asuncion'`.
- [x] `page.tsx` Server Component: parsear `searchParams` como Promise (`from`, `to`) y fetchear agenda.
- [x] Renderizar encabezado `Atleta · Explorar y reservar clases` (compuesto por F2) y saludo `Hola, {displayName}. Elegí tu próximo turno.`.
- [x] `ClassDateFilter` Client Component con el mes `Octubre 2026`, días `26`, `28`, `29`, `Hoy, 27`, `31`, `01` y franjas `12:30`, `17:00`, `18:00`, `19:00`, `20:00` cuando existan en los datos.
- [x] Resaltar la franja «Hoy, 19:00» como selección por defecto.
- [x] Inyectar el chip «Libre mensual» desde F4 en el encabezado; ocultarlo si no hay membresía activa.
- [x] `ClassList` + `ClassCard` con título, coach, hora, duración, cupos y badge `Libre` / `Lista de espera`.
- [x] Empty state «No hay turnos en este rango» y skeleton de 4 tarjetas.

### 2.2 Reserva

- [x] `useBookAction()` con `Idempotency-Key` estable por `wod_id` + `intentVersion`.
- [x] `BookButton` deshabilitado si turno iniciado, sin membresía o request en curso; muestra razón accesible.
- [x] Si `available_slots === 0`, etiqueta «Entrar en lista de espera».
- [x] Manejo de respuestas:
      - `201` + `CONFIRMED` → toast «Reserva confirmada»;
      - `200` + `WAITLIST` → toast con `waitlist_position`;
      - `403 MEMBERSHIP_REQUIRED` → CTA a `/memberships`;
      - `409 BOOKING_ALREADY_EXISTS` → CTA a `/bookings`;
      - `429` → segundos de `Retry-After`.
- [x] `router.refresh()` tras éxito para actualizar cupos y dashboard.

### 2.3 Validación de membresía

- [x] Obtener membresía vigente una vez en la página (reutilizar `pickCurrent()` de F4).
- [x] Pasar `hasActiveMembership` como prop serializable a `BookButton`.
- [x] No ocultar el botón sin explicación: mostrar aviso y enlace a `/memberships`.

### 2.4 Responsive y a11y

- [x] Filtro de días scrollable en móvil con `aria-label="Elegir día"`.
- [x] Tarjetas apiladas < 768 px; grid 2–3 columnas en desktop.
- [x] Botón con `aria-describedby` apuntando al estado de cupo.
- [x] Toast con `role="status"`/`role="alert"` según éxito o error.
- [x] Badge `Libre` incluye texto, no solo color.

---

## 3. Pruebas

- [x] `boxToday()` devuelve la fecha correcta con reloj fijo y TZ del box.
- [x] `toUtcIso('2026-11-17', '19:00')` genera el ISO `Z` correcto.
- [x] `formatSlotTime('2026-11-17T22:00:00Z') === '19:00'`.
- [x] `formatDayLabel()` → `Hoy`, `Mañana` o día abreviado.
- [x] `getSlotBadge(0) === 'Lista de espera'`.
- [x] `useBookAction` reutiliza la misma `Idempotency-Key` en reintentos.
- [x] E2E: agenda muestra `Fuerza + metcon` y `Libre`.
- [x] E2E: reserva con cupo → toast y cupo actualizado.
- [x] E2E: turno lleno → posición de waitlist.
- [x] E2E: sin membresía → aviso y CTA, sin POST.
- [x] E2E: doble click → una sola reserva.

---

## 4. Definition of Done

- [x] Copy exacto de la captura en encabezado, saludo, mes/días, horarios y badge.
- [x] Zona horaria `America/Asuncion` en cálculo y presentación.
- [x] Idempotencia implementada y probada.
- [x] Errores mapeados por `code`.
- [x] Cuatro estados de UI.
- [x] Accesibilidad de filtros, botones y toasts.
- [x] `npm run lint` y `npm run build` en verde.

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Horarios del OCR no existen en datos reales | Son ejemplos de diseño (`12:30`, `17:00`, `18:00`, `19:00`, `20:00`); el filtro se genera desde `start_time` de la API |
| Cupo mostrado desactualizado | `router.refresh()` + `no-store`; el backend es autoritativo |
| Doble reserva por reintento de red | `Idempotency-Key` y botón deshabilitado |
| `19:00` se interprete como UTC del navegador | Helper único con `timeZone` explícito |
| Usuario sin membresía ve botón “muerto” | Aviso concreto con CTA a `/memberships` |
