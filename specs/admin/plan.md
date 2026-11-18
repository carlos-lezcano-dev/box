# Plan de implementación — Administración

**Feature ID:** F7
**Estado:** completo
**Estimación:** 3 días
**Precondición:** F1, F2 y Fase 0; reutiliza helpers de F4, F5 y F6
**Restricción:** no modifica F3, F4, F5 ni F6. Si falta un helper compartido se registra como dependencia, no se copia ni se edita la otra feature.

---

## 1. Archivos a crear

```
app/(app)/admin/layout.tsx
app/(app)/admin/page.tsx
app/(app)/admin/loading.tsx
app/(app)/admin/error.tsx
app/(app)/admin/users/page.tsx
app/(app)/admin/schedule/page.tsx
app/(app)/admin/schedule/[wodId]/page.tsx
app/(app)/admin/memberships/page.tsx
src/api/admin-users.ts
src/api/admin-wods.ts
src/api/admin-bookings.ts
src/api/admin-memberships.ts
src/components/features/admin/admin-subnav.tsx
src/components/features/admin/user-metrics.tsx
src/components/features/admin/user-table.tsx
src/components/features/admin/create-user-form.tsx
src/components/features/admin/week-range.tsx
src/components/features/admin/type-filter.tsx
src/components/features/admin/create-wod-form.tsx
src/components/features/admin/wod-schedule-list.tsx
src/components/features/admin/wod-detail.tsx
src/components/features/admin/booking-roster.tsx
src/components/features/admin/cancel-booking-dialog.tsx
src/components/features/admin/admin-membership-metrics.tsx
src/components/features/admin/admin-membership-table.tsx
src/components/features/admin/register-payment-form.tsx
src/components/features/admin/confirm-dialog.tsx
src/lib/admin-view.ts
src/lib/admin-view.spec.ts
tests/e2e/admin.spec.ts
```

> Los `loading.tsx` y `error.tsx` de `/admin` se heredan en las subvistas; no se duplican por segmento.

---

## 2. Tareas

### 2.1 Base y RBAC

- [x] `app/(app)/admin/layout.tsx` llama a `requireUser()` y verifica `role === 'ADMIN'`; si no, renderiza «Acceso restringido» sin lanzar las consultas de las subvistas.
- [x] `app/(app)/admin/page.tsx` es el hub «Administración» con accesos a Usuarios, Agenda turnos y Membresías y pagos; no renderiza el dashboard de F3.
- [x] `AdminSubnav` muestra solo la navegación secundaria dentro de `/admin`; el menú lateral de cinco ítems lo aporta F2 y `Panel general` enlaza a `/`.
- [x] Verificar que F2 ya expone los cinco ítems del menú ADMIN; si no, registrar la dependencia como bloqueante sin editar F2 desde esta feature.
- [x] `loading.tsx` con skeletons de métricas y tabla; `error.tsx` con `request_id` y botón «Reintentar» (`retry()`, no `reset()`).
- [x] Envolver la lectura de sesión y cada bloque con `cache: 'no-store'` en `<Suspense>` propio; con `cacheComponents: true`, leer cookies fuera de un boundary rompe el build.

### 2.2 Gestión de usuarios

- [x] `src/api/admin-users.ts`: `listUsers()`, `getUserById()` y `registerUser()` con `cache: 'no-store'` y manejo de envelope.
- [x] `UserMetrics` ejecuta las cuatro consultas `GET /users?limit=1` en paralelo y pinta `156 Todos`, `148 Atletas`, `6 Entrenadores`, `2 Administradores` desde `meta.total`.
- [x] `UserTable` muestra nombre, email, rol, «Alta» con `Hoy, 09:12`, estado activo y paginación «siguiente» desde `meta.total_pages`.
- [x] `CreateUserForm` se abre desde `+ Nuevo`, envía `role` con `POST /users/register`, no inicia sesión y refresca el listado tras `201`.
- [x] `POST /users/register` no reenvía un token expirado: si la sesión ADMIN no es válida, se renueva o se muestra el error de sesión sin reintentar (RN-FE-ADM-31).
- [x] Mapear `USER_EMAIL_TAKEN`, `VALIDATION_ERROR` (por `details[].field`), `USER_ROLE_NOT_ALLOWED`, `RATE_LIMITED` y `request_id`.
- [x] `UserTable` deshabilita «siguiente» con `page >= meta.total_pages` o `meta.total_pages === 0`.
- [x] `Ver vencidas` queda como enlace a `/admin/memberships?status=EXPIRED` con un `TODO` de confirmación.

### 2.3 Agenda de turnos

- [x] `src/api/admin-wods.ts`: `getWods()`, `getWodById()`, `createWod()`, `updateWod()` y `cancelWod()` con `cache: 'no-store'` en lecturas.
- [x] `WeekRange` calcula lunes → viernes en `America/Asuncion`, convierte a ISO UTC y renderiza `26 - 30 de octubre` y `LUN 26` desde la fecha real. Como `to` es exclusivo, envía el sábado `00:00` como `to` (no el viernes `00:00`).
- [x] Gestionar 400 `VALIDATION_ERROR` con `details[].field === 'to'` y `rule === 'range'` cuando el rango supera 31 días.
- [x] `TypeFilter` filtra localmente sobre título/descripción cargados; no envía `type` al backend y deja la taxonomía marcada como pendiente.
- [x] `CreateWodForm` convierte la hora local del formulario a UTC, permite elegir coach entre `COACH`/`ADMIN` activos y envía `POST /wods`.
- [x] `WodScheduleList` pinta tarjetas con `WOD`, hora `20:00`, coach «Carolina Molina», cupos y enlace al detalle; incluye empty state «No hay turnos en este rango».
- [x] Gestionar `WOD_INVALID_TIME_RANGE`, `WOD_START_IN_PAST`, `WOD_COACH_INVALID` y `RATE_LIMITED` sin cerrar el diálogo.

### 2.4 Detalle y lista de espera

- [x] `src/api/admin-bookings.ts`: `getWodRoster()` y `cancelBooking()` con `cache: 'no-store'`.
- [x] `WodDetail` pide `GET /wods/:id` y `GET /wods/:id/bookings` en paralelo y renderiza `WOD · Fuerza + metcon`, fecha/hora y «Equipo».
- [x] `BookingRoster` muestra «Participantes», `AFORO 12/12`, «3 atletas» como hipótesis de `waitlist_count` y la «Lista de espera» ordenada por `position`.
- [x] `getInitials()` deriva las iniciales desde `full_name`; las secuencias del OCR quedan como datos de ejemplo en tests, sin mapping hardcodeado.
- [x] `CancelBookingDialog` usa `ConfirmDialog`, llama a `DELETE /bookings/:booking_id` y avisa `promoted: true` con `role="status"`.
- [x] `WodDetail` ofrece `PATCH /wods/:id` y `DELETE /wods/:id` con confirmación; muestra `cancelled_bookings`, `WOD_ALREADY_STARTED` y `WOD_CAPACITY_BELOW_BOOKINGS`.
- [x] «Sala principal» se deja como texto fijo pendiente de confirmación; si no se confirma, se oculta sin romper el copy del resto.

### 2.5 Membresías ADMIN

- [x] `src/api/admin-memberships.ts`: `listMemberships()`, `createMembership()` con `idempotencyKey` y `updateMembershipStatus()` con `cache: 'no-store'`.
- [x] `AdminMembershipMetrics` muestra `130`, `18`, `130` y `$6.240.000` con la nota «Pendiente de confirmación»; no asigna etiquetas definitivas ni trata el importe como un solo `amount_paid`.
- [x] `AdminMembershipTable` aplica filtros `user_id`, `status`, `from`, `to`, `sort`, `order` y paginación con `meta`, sin sumar páginas parciales.
- [x] `RegisterPaymentForm` genera una `Idempotency-Key` al abrirse, la reutiliza en reintentos y gestiona `IDEMPOTENCY_CONFLICT` y `MEMBERSHIP_INVALID_PERIOD`. La clave es opcional en el backend: la ausencia no produce 400.
- [x] Mapear `amount_paid` inválido desde 400 `VALIDATION_ERROR` con `details[].field === 'amount_paid'`; mantener `MEMBERSHIP_INVALID_AMOUNT` (422) solo como manejo defensivo.
- [x] El selector de estado ofrece solo `ACTIVE`, `FROZEN` y `CANCELLED` según las transiciones válidas; no aparece acción para `EXPIRED`.
- [x] Reutilizar el formateo de moneda y el badge de estado de F4 sin editar los archivos de F4: ambos viven en `src/lib/membership-display.ts` y `src/components/ui/membership-status-badge.tsx`.

### 2.6 Estados, responsive y accesibilidad

- [x] Cuatro estados (loading, empty, error, success) en usuarios, agenda, detalle y membresías.
- [x] Errores con `error.code` legible para soporte, `request_id` y botón «Reintentar»; `role="alert"` en errores y `role="status"` en cargas y promociones.
- [x] Tablas con scroll horizontal < 768 px y tarjetas apiladas; sidebar fijo `lg:` heredado del shell.
- [x] Diálogos con `role="dialog"`, `aria-modal`, foco inicial, cierre con `Escape` y retorno de foco al disparador.
- [x] Enlaces con `aria-current="page"`, botones con texto visible o `aria-label`, badges con texto y contraste AA verificado.
- [x] `params`/`searchParams` tratados como `Promise` con `PageProps<'/admin/schedule/[wodId]'>` y helpers globales.

---

## 3. Pruebas

- [x] `getUserMetrics()` devuelve `todos: 156, atletas: 148, entrenadores: 6, administradores: 2` desde cuatro `meta.total` distintos.
- [x] `getRoleLabel('COACH') === 'Entrenador'` y `getRoleLabel('ADMIN') === 'Administrador'`.
- [x] `getCreatedAtLabel()` con reloj fijo devuelve `Hoy, 09:12` en `America/Asuncion`.
- [x] `getWeekRange('2026-10-28')` devuelve el lunes 26 y el viernes 30 de octubre convertidos a ISO UTC.
- [x] `TypeFilter` no agrega claves `type` a la query y filtra solo el arreglo cargado.
- [x] `getInitials('Camila Ruiz') === 'CR'`; nombre vacío devuelve `?`.
- [x] `getCapacityLabel(12, 12) === 'AFORO 12/12'` y la waitlist se ordena por `position ASC`.
- [x] `RegisterPaymentForm` reutiliza la misma `Idempotency-Key` en dos envíos y la regenera tras `IDEMPOTENCY_CONFLICT` confirmado.
- [x] `getStatusLabel` y las transiciones: `ACTIVE → FROZEN` permitida, `CANCELLED → ACTIVE` rechazada.
- [x] `ApiError` expone `code`, `status` y `request_id`; la UI no decide por el texto de `message`.
- [x] `getWeekRange` devuelve `to` en sábado `00:00`, nunca en viernes `00:00`.
- [x] Importe inválido se mapea desde 400 `VALIDATION_ERROR` con `details[].field === 'amount_paid'`.
- [x] Paginación deshabilita «siguiente» cuando `meta.total_pages === 0`.
- [x] E2E: ADMIN ve los cinco ítems del menú y `Panel general` lleva a `/` sin duplicar F3.
- [x] E2E: `/admin/users` muestra métricas, filas, «Hoy, 09:12» y paginación «siguiente».
- [x] E2E: alta con `role=COACH`, error `USER_EMAIL_TAKEN` y sin login automático.
- [x] E2E: agenda con rango semanal, «Tipo: todos» y creación de turno válida/inválida.
- [x] E2E: detalle con `AFORO 12/12`, waitlist y cancelación ajena con promoción.
- [x] E2E: `/admin/memberships` muestra métricas con etiqueta pendiente, registro de pago y transición inválida.
- [x] E2E: ATHLETE no ve el menú; al forzar `/admin/users` ve «Acceso restringido» y un 401 redirige a `/login`.
- [x] axe: diálogos, tablas y filtros sin violaciones AA.

---

## 4. Definition of Done

- [x] Copy exacto de las cuatro pantallas y de los cinco ítems del menú.
- [x] Panel general delegado a F3; subvista de membresías conectada con F4 sin modificarla.
- [x] Solo ADMIN accede a `/admin/**`; errores `403` tratados como acceso restringido.
- [x] Lecturas autenticadas con `cache: 'no-store'` y cliente HTTP único.
- [x] Envelope `success`/`data`/`meta` y errores por `error.code` con `request_id` visible.
- [x] `Idempotency-Key` estable en `POST /memberships` (opcional en el backend) y revalidación mediante `router.refresh()`.
- [x] Errores de importe por `VALIDATION_ERROR` 400; paginación con `total_pages === 0`; `to` exclusivo en la agenda; `POST /users/register` sin token expirado.
- [x] Fechas en `America/Asuncion` y transporte UTC con `Z`.
- [x] Cuatro estados en cada lista y diálogos accesibles.
- [x] Hipótesis del OCR documentadas: `Molina`, `Ver vencidas`, `Hoy, 09:12`, `Tipo: todos`, `Sala principal`, `3 atletas`, iniciales y métricas de membresías.
- [x] `npm run lint`, `npm run build`, pruebas unitarias y E2E en verde.

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| El OCR recortó nombres e iniciales | No emparejar listas; derivar iniciales de `full_name` y marcar `Molina` como pendiente |
| Etiquetas de métricas de membresías erróneas | Mostrar solo los valores con nota «Pendiente de confirmación»; tabla de hipótesis en `spec.md` |
| `$6.240.000` excede el máximo por pago del contrato | No precargarlo en `amount_paid`; tratarlo como valor agregado hasta confirmar |
| `Tipo: todos` no existe en la API | Filtro local sin query inventada; taxonomía pendiente |
| «Sala principal» no tiene campo en el DTO | Texto fijo pendiente de confirmar u oculto |
| «3 atletas» se interprete como participantes | Se mapea a `waitlist_count` con hipótesis explícita y aforo `confirmed_count/max_capacity` |
| `last_seen` no existe | Usar `created_at` con la etiqueta «Alta» bajo hipótesis |
| Posición de waitlist desactualizada | `no-store` + `router.refresh()` tras cada cancelación |
| Doble envío de `Registrar pago` | `Idempotency-Key` estable por intención y botón deshabilitado |
| El backend ignora la `Idempotency-Key` | Es opcional: deduplicar en el cliente y no asumir 400 por omitirla |
| Importe inválido devuelve `VALIDATION_ERROR` en vez de `MEMBERSHIP_INVALID_AMOUNT` | Leer `details[].field === 'amount_paid'`; mantener el 422 solo por robustez |
| `to` exclusivo en `/wods` excluye el viernes | Enviar sábado `00:00` como `to` en la agenda semanal |
| `meta.total_pages === 0` rompe la paginación | Deshabilitar «siguiente» con `page >= total_pages` o `total_pages === 0` |
| Token expirado en `POST /users/register` (`@OptionalAuth`) | No adjuntar la cookie de sesión vencida; renovar antes de dar de alta |
| `PATCH /wods` con aforo menor a confirmados | Mostrar `confirmed_count` y dejar que el backend valide `WOD_CAPACITY_BELOW_BOOKINGS` |
| F2 aún no incluye el menú ADMIN | Registrar bloqueante; F7 no crea un sidebar paralelo |
| Copia involuntaria de lógica de F3/F4/F5/F6 | Reutilizar helpers existentes y revisar el diff antes de cerrar la feature |
