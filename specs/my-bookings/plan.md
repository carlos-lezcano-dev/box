# Plan de implementación — Mis reservas

**Feature ID:** F5
**Estado:** pendiente
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

- [ ] `src/api/bookings.ts`: `getMyBookings()` con `cache: 'no-store'`.
- [ ] `src/lib/booking-view.ts`: `toBookingView()`, `filterActive()`, `sortByStartTime()`, `getStatusLabel()`.
- [ ] Normalizar `wod` anidado o resolver con `GET /wods/:id` si el contrato no lo trae.
- [ ] `page.tsx` con encabezado `Atleta · Mis reservas` (F2) y subtítulo `Tu entrenamiento, organizado.`.
- [ ] `BookingsEmptyState` con CTA a `/classes`.

### 2.2 Cancelación

- [ ] `useCancelBooking()` hook Client Component:
      llama `DELETE /bookings/:id`, deshabilita botón durante la request y expone `error` tipado.
- [ ] `CancelBookingDialog` con título exacto `¿Cancelar tu reserva?`, nombre del turno, «Volver» y «Confirmar cancelación».
- [ ] Foco inicial en «Volver», cierre con `Escape` y bloqueo de scroll de fondo.
- [ ] Tras éxito: `router.refresh()`, aviso `role="status"` y `promoted` message cuando aplique.
- [ ] Mapear errores por `code` según `api.md`.

### 2.3 Agrupación y chip de membresía

- [ ] `BookingGroup` separa «Reservas confirmadas» y «Lista de espera» según `status`.
- [ ] Inyectar el chip «Libre mensual» desde F4; ocultarlo si no hay membresía activa.

### 2.4 Responsive y a11y

- [ ] Lista en filas `md:` y tarjetas apiladas en móvil.
- [ ] Badge de estado con texto + color.
- [ ] `aria-live="polite"` para avisos de cancelación/promoción.
- [ ] `loading.tsx` con 3 skeletons.

---

## 3. Pruebas

- [ ] `filterActive()` excluye `CANCELLED` y `NOSHOW`.
- [ ] `sortByStartTime()` ordena por ISO string.
- [ ] `getStatusLabel()` para `CONFIRMED`/`WAITLIST`/`CANCELLED`/`NOSHOW`.
- [ ] No se muestra `#null` cuando `waitlist_position` es `null`.
- [ ] Diálogo abre con foco en «Volver» y cierra con `Escape`.
- [ ] Botón deshabilitado durante la request.
- [ ] E2E: cancelar con `promoted: true` muestra aviso.
- [ ] E2E: `BOOKING_ALREADY_CANCELLED` recarga la lista.
- [ ] E2E: estado vacío con CTA a `/classes`.

---

## 4. Definition of Done

- [ ] Copy exacto `Atleta · Mis reservas`, `Tu entrenamiento, organizado.`, `Reservas confirmadas`, `Lista de espera`, `¿Cancelar tu reserva?`.
- [ ] Posición de waitlist visible como texto.
- [ ] Cancelación no optimista: refleja la decisión del backend.
- [ ] Cuatro estados de UI.
- [ ] Diálogo accesible.
- [ ] `npm run lint` y `npm run build` en verde.

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `wod` no viene anidado | Mapper con fallback a `/wods/:id` y caché por render |
| Doble cancelación por doble click | `isPending` + botón deshabilitado |
| Hora mostrada en zona del navegador | Helper con `America/Asuncion` |
| Promoción del backend no visible | Leer `data.promoted` y mostrar aviso `role="status"` |
