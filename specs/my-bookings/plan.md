# Plan de implementación — Mis reservas

**Feature ID:** F5
**Estado:** completo
**Estimación:** 1 día
**Precondición:** F1, F2 y contrato `GET /bookings/me` disponible

---

## 1. Archivos a crear

```
app/(app)/bookings/page.tsx
app/(app)/bookings/loading.tsx
src/api/bookings.ts
src/components/features/bookings/booking-list.tsx
src/components/features/bookings/booking-item.tsx
src/components/features/bookings/booking-status-badge.tsx
src/components/features/bookings/cancel-booking-dialog.tsx
src/components/features/bookings/bookings-empty-state.tsx
src/components/features/bookings/booking-group.tsx
src/hooks/use-cancel-booking.ts
src/lib/booking-view.ts
src/lib/booking-view.spec.ts
tests/e2e/bookings.spec.ts
```

---

## 2. Tareas

### 2.1 Lectura

- [x] `src/api/bookings.ts`: `getMyBookings()` con `cache: 'no-store'`.
- [x] `src/lib/booking-view.ts`: `toBookingView()`, `filterActive()`, `sortByStartTime()`, `getStatusLabel()`.
- [x] Normalizar `wod` anidado o resolver con `GET /wods/:id` si el contrato no lo trae.
- [x] `page.tsx` con encabezado `Atleta · Mis reservas` (F2) y subtítulo `Tu entrenamiento, organizado.`.
- [x] `BookingsEmptyState` con CTA a `/classes`.

### 2.2 Cancelación

- [x] `useCancelBooking()` hook Client Component:
      llama `DELETE /bookings/:id`, deshabilita botón durante la request y expone `error` tipado.
- [x] `CancelBookingDialog` con título exacto `¿Cancelar tu reserva?`, nombre del turno, «Volver» y «Confirmar cancelación».
- [x] Foco inicial en «Volver», cierre con `Escape` y bloqueo de scroll de fondo.
- [x] Tras éxito: `router.refresh()`, aviso `role="status"` y `promoted` message cuando aplique.
- [x] Mapear errores por `code` según `api.md`.

### 2.3 Agrupación y chip de membresía

- [x] `BookingGroup` separa «Reservas confirmadas» y «Lista de espera» según `status`.
- [x] Inyectar el chip «Libre mensual» desde F4; ocultarlo si no hay membresía activa.

### 2.4 Responsive y a11y

- [x] Lista en filas `md:` y tarjetas apiladas en móvil.
- [x] Badge de estado con texto + color.
- [x] `aria-live="polite"` para avisos de cancelación/promoción.
- [x] `loading.tsx` con 3 skeletons.

---

## 3. Pruebas

- [x] `filterActive()` excluye `CANCELLED` y `NOSHOW`.
- [x] `sortByStartTime()` ordena por ISO string.
- [x] `getStatusLabel()` para `CONFIRMED`/`WAITLIST`/`CANCELLED`/`NOSHOW`.
- [x] No se muestra `#null` cuando `waitlist_position` es `null`.
- [x] Diálogo abre con foco en «Volver» y cierra con `Escape`.
- [x] Botón deshabilitado durante la request.
- [x] E2E: cancelar con `promoted: true` muestra aviso.
- [x] E2E: `BOOKING_ALREADY_CANCELLED` recarga la lista.
- [x] E2E: estado vacío con CTA a `/classes`.

---

## 4. Definition of Done

- [x] Copy exacto `Atleta · Mis reservas`, `Tu entrenamiento, organizado.`, `Reservas confirmadas`, `Lista de espera`, `¿Cancelar tu reserva?`.
- [x] Posición de waitlist visible como texto.
- [x] Cancelación no optimista: refleja la decisión del backend.
- [x] Cuatro estados de UI.
- [x] Diálogo accesible.
- [x] `npm run lint` y `npm run build` en verde.

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `wod` no viene anidado | Mapper con fallback a `/wods/:id` y caché por render |
| Doble cancelación por doble click | `isPending` + botón deshabilitado |
| Hora mostrada en zona del navegador | Helper con `America/Asuncion` |
| Promoción del backend no visible | Leer `data.promoted` y mostrar aviso `role="status"` |
