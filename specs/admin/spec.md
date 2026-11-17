# Feature: Administración

**Feature ID:** F7
**Carpeta de implementación:** `app/(app)/admin/`, `src/components/features/admin/`
**Requisitos:** RF-FE-10 a RF-FE-13 (propuestos; alta en el catálogo fuera de este cambio)
**Depende de:** F1, F2 y Fase 0; reutiliza F4 (formateo de membresías), F5 (feedback de cancelación) y F6 (fechas)
**Rutas:** `/admin`, `/admin/users`, `/admin/schedule`, `/admin/schedule/[wodId]`, `/admin/memberships`
**Endpoint principal:** `GET /users`, `GET /wods`, `GET /wods/:wod_id/bookings`, `GET /memberships`

---

## 1. Alcance

F7 reúne las pantallas administrativas recuperadas por OCR de las capturas de `specs/Rererences/`. El menú lateral ADMIN queda definido así:

| Texto del menú | Destino | Responsable |
|----------------|---------|-------------|
| `Panel general` | `/` | **F3 (dashboard). F7 no lo duplica.** |
| `Agenda turnos` | `/admin/schedule` | F7 |
| `Usuarios` | `/admin/users` | F7 |
| `Membresías y pagos` | `/admin/memberships` | F7 (subvista ADMIN, vínculo con F4) |
| `Administración` | `/admin` | F7 (hub de accesos) |

### 1.1 Gestión de usuarios

| Texto / dato de la captura | Implementación |
|----------------------------|----------------|
| `Gestión de usuarios`, `Usuarios` | Título de `/admin/users` y etiqueta del menú |
| `El motor del box.` | Subtítulo |
| `Gestioná atletas, entrenadores y administradores desde un mismo lugar.` | Copy descriptivo |
| `156 Todos`, `148 Atletas`, `6 Entrenadores`, `2 Administradores` | Métricas desde `meta.total` de `GET /users` (RN-FE-ADM-05 y 06). Estos rótulos sí se leyeron con fiabilidad. |
| `+ Nuevo` | Alta de usuario con `POST /users/register` enviando `role` (RN-FE-ADM-07) |
| `Sofía Ríos`, `Bruno Méndez`, `Diego Castro`, `Camila Ruiz`, `Martín Vega`, `Valentina Paz`, `Molina` | Filas de ejemplo del diseño. `Molina` se normaliza a `Carolina Molina` por coincidencia con la coach de la agenda; confirmar. |
| `Atleta` / `Administrador` | Etiquetas visuales de `role` |
| `Ver vencidas` | Enlace a `/admin/memberships?status=EXPIRED` como **hipótesis** (TODO) |
| `Hoy, 09:12` | Fecha de alta derivada de `created_at` en `America/Asuncion`; el DTO no expone `updated_at` ni `last_seen` |
| `siguiente` | Paginación server-side con `meta.total_pages` |

### 1.2 Agenda de turnos

| Texto / dato de la captura | Implementación |
|----------------------------|----------------|
| `Agenda de turnos` | Título de `/admin/schedule` |
| `Cada turno, bajo control.` | Subtítulo |
| `Clases, entrenadores y cupos de la semana. Seleccioná un día para gestionarlo.` | Copy descriptivo |
| `26 - 30 de octubre` | Rango lunes → viernes de la semana en `America/Asuncion`; el texto es ejemplo del diseño |
| `Tipo: todos` | Filtro **local** sobre los WODs cargados; el contrato no expone un parámetro `type` (RN-FE-ADM-12) |
| `Crear turno` | `POST /wods` desde un diálogo |
| `LUN 26` | Cabecera de día calculada desde `start_time` |
| `WOD`, `20:00`, `Carolina Molina` | Tarjeta de turno: título, hora y coach asignado |

### 1.3 Detalle de turno y lista de espera

| Texto / dato de la captura | Implementación |
|----------------------------|----------------|
| `Detalle de turno y lista de espera` | Título de `/admin/schedule/[wodId]` |
| `WOD · Fuerza + metcon` | `title` del WOD junto a un resumen de su `description` |
| `Martes 27 de octubre de 2026 · 18:00 - 19:00 · Sala principal` | Fecha y hora desde `start_time`/`end_time`. «Sala principal» no tiene campo en `WodResponseDto`: se trata como texto fijo pendiente de confirmar. |
| `Equipo`, `Participantes`, `AFORO 12/12`, `Lista de espera` | Secciones del detalle |
| `Carolina Molina` / `Martín Vega` | Coach en los ejemplos: agenda / detalle. Se toma de `coach_id`, no se hardcodea. |
| `3 atletas` | **Hipótesis:** `waitlist_count`. No es el total de participantes, porque el aforo figura `12/12`. |
| `NA`, `CR`, `MS`, `JN` y `Camila Ruiz`, `Silvina Costa`, `Tomás H`, `Julieta` | Iniciales derivadas de `full_name`. El OCR recortó las listas y no permite emparejar iniciales con nombres una a uno; no se hardcodea un mapping. |

### 1.4 Membresías y pagos mensuales (vista ADMIN)

| Texto / dato de la captura | Implementación |
|----------------------------|----------------|
| `Membresías y pagos mensuales`, `Vigencias claras. Cuentas al día.` | Título y subtítulo de `/admin/memberships` |
| `130`, `18`, `130`, `$6.240.000` | Valores del diseño. **Las etiquetas no se leyeron con fiabilidad**: se documentan como hipótesis en §6 y no se presenta ningún significado como verdadero. |
| `Registrar pago` | `POST /memberships` con `Idempotency-Key` |
| Listado de membresías | `GET /memberships` con filtros `user_id`, `status`, `from`, `to`, paginación y orden |

**No incluye:** panel general administrativo (es F3), dashboard de atleta, edición de perfil, cobros online, facturación, reembolsos, check-in, reservas recurrentes, notificaciones ni exportaciones.

---

## 2. Actores

| Actor | Puede ver / hacer en F7 |
|-------|-------------------------|
| `ADMIN` | Acceso completo a las cuatro subvistas y a todas las escrituras: alta de usuarios, alta/edición/cancelación de turnos, cancelación de reservas ajenas, registro de pagos y cambio de estado de membresías. |
| `COACH` | No ve el menú de F7. El backend permite `GET /wods/:wod_id/bookings` para el coach asignado, pero esta feature no expone esa ruta en v1. |
| `ATHLETE` | Sin acceso al menú ni a las rutas; el backend responde `403 AUTH_FORBIDDEN` si se fuerzan los endpoints. |

> Ocultar el menú es UX; la autoridad la tienen los guards del backend. Un `403` se trata como «acceso restringido», no como sesión expirada.

---

## 3. Reglas de UX

| ID | Regla |
|----|-------|
| RN-FE-ADM-01 | Las rutas `/admin/**` exigen sesión y rol `ADMIN`. El layout verifica el rol antes de renderizar el contenido; ante `403` se muestra acceso restringido sin redirigir a `/login`. |
| RN-FE-ADM-02 | `Panel general` enlaza a `/` y lo resuelve F3. F7 no vuelve a implementar métricas, saludos ni cards del dashboard. |
| RN-FE-ADM-03 | El menú lateral de cinco ítems lo aporta F2. F7 solo agrega una navegación secundaria dentro de `/admin` para las subvistas; no renderiza un sidebar alternativo. |
| RN-FE-ADM-04 | Toda lectura autenticada usa el cliente HTTP único con `cache: 'no-store'`. Ningún componente llama a `fetch` directo contra la API. |
| RN-FE-ADM-05 | La tabla de usuarios es paginada en servidor: `page` ≥ 1, `limit` 1–100, `q` 1–100, `sort` ∈ `created_at`/`full_name`/`email` y `order` ∈ `asc`/`desc`. El total de páginas sale de `meta.total_pages`; nunca de `data.length`. |
| RN-FE-ADM-06 | Las métricas de usuarios se obtienen con `GET /users?limit=1` más tres consultas con `role=ATHLETE`, `role=COACH` y `role=ADMIN`, usando `meta.total` de cada una. No se aplica `is_active` por defecto. `COACH` se etiqueta «Entrenadores». |
| RN-FE-ADM-07 | `+ Nuevo` abre un diálogo con `POST /users/register`. Siendo ADMIN se envía `role`; el registro no emite token, por lo que no se inicia sesión ni se redirige al dashboard. Tras `201` se refresca el listado. |
| RN-FE-ADM-08 | Errores de alta mapeados por `error.code`: `USER_EMAIL_TAKEN` marca el campo `email`; `VALIDATION_ERROR` usa `error.details[].field`; `USER_ROLE_NOT_ALLOWED` y `AUTH_FORBIDDEN` muestran acceso restringido; `RATE_LIMITED` respeta `Retry-After`. |
| RN-FE-ADM-09 | `Ver vencidas` apunta a `/admin/memberships?status=EXPIRED` como hipótesis; se deja un `TODO` hasta confirmar si en realidad refiere a membresías vencidas de cada usuario. |
| RN-FE-ADM-10 | `Hoy, 09:12` se calcula desde `created_at` con `America/Asuncion`. Como el DTO no expone última actividad, la columna se rotula «Alta» bajo hipótesis; no se inventa un campo `last_seen`. |
| RN-FE-ADM-11 | La agenda usa por defecto lunes → viernes de la semana actual en `America/Asuncion`, convertido a ISO UTC para `from`/`to`. El rango máximo es 31 días; los textos `26 - 30 de octubre` y `LUN 26` son ejemplos generados desde la fecha, no constantes. |
| RN-FE-ADM-12 | `Tipo: todos` no envía ningún parámetro `type` al backend. El filtro es local sobre los WODs ya cargados y sus opciones se derivan del título/descripción; la taxonomía definitiva queda pendiente de confirmación. |
| RN-FE-ADM-13 | `Crear turno` envía `POST /wods` con `start_time`/`end_time` ISO UTC. El selector de coach usa usuarios `COACH` y `ADMIN` activos (`GET /users?is_active=true`, filtrado por rol en dos consultas); si no se elige nadie, `coach_id` se omite y la tarjeta muestra «Sin asignar». |
| RN-FE-ADM-14 | Errores de turno por `code`: `WOD_INVALID_TIME_RANGE`, `WOD_START_IN_PAST`, `WOD_COACH_INVALID`, `VALIDATION_ERROR` y `RATE_LIMITED`. El formulario permanece abierto con los valores ya cargados. |
| RN-FE-ADM-15 | El detalle pide `GET /wods/:wod_id` y `GET /wods/:wod_id/bookings` en paralelo con `no-store`. `AFORO 12/12` se arma con `confirmed_count` / `max_capacity`; `waitlist_count` alimenta «Lista de espera». |
| RN-FE-ADM-16 | `3 atletas` se interpreta como `waitlist_count` mientras no se confirme lo contrario. No se usa como total de `Participantes`, porque el diseño muestra aforo completo. |
| RN-FE-ADM-17 | Las iniciales de participantes se derivan de `full_name` con un helper; las secuencias `NA`, `CR`, `MS`, `JN` y los nombres del OCR son ejemplos recortados y no se emparejan de forma rígida. La waitlist se ordena por `position ASC` y esa posición nunca se cachea. |
| RN-FE-ADM-18 | Cancelar una reserva ajena requiere confirmación y llama a `DELETE /bookings/:booking_id`. Si `promoted: true`, se muestra `role="status"`: «Se promovió a la siguiente persona de la lista de espera» y se refresca el roster. |
| RN-FE-ADM-19 | Editar un turno usa `PATCH /wods/:id`; cancelarlo usa `DELETE /wods/:id` con confirmación y muestra `cancelled_bookings`. No se ofrecen acciones sobre turnos iniciados: se respeta `WOD_ALREADY_STARTED`. |
| RN-FE-ADM-20 | La subvista de membresías usa `GET /memberships` (ADMIN) y `POST /memberships` con `Idempotency-Key` estable por intención. No modifica `/memberships` de F4, que sigue consumiendo `/memberships/me`. |
| RN-FE-ADM-21 | El cambio de estado usa `PATCH /memberships/:id/status` solo con `ACTIVE`, `FROZEN` o `CANCELLED`. No existe acción para `EXPIRED`: ese estado lo asigna el job del backend. Una transición inválida muestra `MEMBERSHIP_INVALID_TRANSITION`. |
| RN-FE-ADM-22 | Las cuatro métricas de membresías se muestran con etiqueta «Pendiente de confirmación» mientras no se valide su significado. `$6.240.000` no se presenta como `amount_paid` de un único pago: supera el máximo de 1 000 000 por registro del contrato. |
| RN-FE-ADM-23 | `GET /memberships` filtra por `from`/`to` sobre `end_date`, no sobre fecha de pago. No se suman páginas parciales para simular totales de cobros. |
| RN-FE-ADM-24 | Cada lista tiene cuatro estados: skeleton de carga, vacío con copy concreto, error con `error.code` + `request_id` y botón «Reintentar», y success. |
| RN-FE-ADM-25 | Tablas con scroll horizontal en móvil y tarjetas apiladas < 768 px. Diálogos con `role="dialog"`, `aria-modal`, foco inicial y cierre con `Escape`; enlace activo con `aria-current="page"`. |
| RN-FE-ADM-26 | Todo datetime viaja en UTC con `Z` y se presenta con `Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion' })`. Se reutilizan los helpers de F6 en vez de copiarlos. |
| RN-FE-ADM-27 | Las etiquetas de rol son `ATHLETE → Atleta`, `COACH → Entrenador`, `ADMIN → Administrador`. Los badges incluyen texto, no solo color. |

> Errata corregida: el OCR leyó `Molina` de forma aislada en el listado de usuarios; se propone `Carolina Molina` por el coach del mismo diseño, marcado como pendiente de confirmación en §6.

---

## 4. Modelo de vista

```ts
type AdminUserView = {
  user_id: string
  full_name: string
  email: string
  phone: string | null
  emergency_contact: string | null
  role: 'ATHLETE' | 'COACH' | 'ADMIN'
  is_active: boolean
  created_at: string // ISO UTC
}

type AdminWodView = {
  wod_id: string
  coach_id: string | null
  coach_full_name: string | null
  title: string
  description: string | null
  start_time: string // ISO UTC
  end_time: string   // ISO UTC
  max_capacity: number
  confirmed_count: number
  available_slots: number
  waitlist_count: number
}

type AdminRosterView = {
  wod_id: string
  max_capacity: number
  confirmed_count: number
  waitlist_count: number
  confirmed: Array<{
    booking_id: string
    user_id: string
    full_name: string
    booked_at: string
    promoted_at: string | null
  }>
  waitlist: Array<{
    booking_id: string
    user_id: string
    full_name: string
    booked_at: string
    position: number
  }>
}

type AdminMembershipView = {
  membership_id: string
  user_id: string
  plan_name: string
  amount_paid: number
  start_date: string // YYYY-MM-DD
  end_date: string   // YYYY-MM-DD, inclusivo
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
  payment_method: 'CASH' | 'TRANSFER' | 'CREDIT_CARD'
  notes: string | null
  created_by: string | null
  created_at: string
}
```

Derivados:

| Valor | Regla |
|-------|-------|
| `roleLabel` | Ver RN-FE-ADM-27 |
| `createdAtLabel` | `Hoy, HH:mm` si `created_at` es hoy en `America/Asuncion`; si no, `lun 26, HH:mm` |
| `initials` | Primeras letras de los dos primeros tokens de `full_name`, en mayúsculas; fallback `?` si no hay nombre |
| `dayHeader` | `LUN 26`, `MAR 27`, … desde `start_time` con `America/Asuncion` |
| `capacityLabel` | `AFORO ${confirmed_count}/${max_capacity}` |
| `formattedAmount` | `Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 })` |
| `formattedDateRange` | `26 - 30 de octubre` a partir del lunes y viernes de la semana del box |

---

## 5. Criterios de aceptación

```gherkin
Escenario: ADMIN ve el menú sin duplicar el panel general
  Dado un usuario ADMIN autenticado
  Cuando abre /admin
  Entonces ve "Panel general", "Agenda turnos", "Usuarios", "Membresías y pagos" y "Administración"
  Y "Panel general" lleva a /
  Y no se renderiza una segunda versión del dashboard de F3

Escenario: Gestión de usuarios con métricas y paginación
  Dado 156 usuarios, 148 atletas, 6 entrenadores y 2 administradores
  Cuando abre /admin/users
  Entonces ve "Gestión de usuarios", "El motor del box." y el copy del diseño
  Y ve "156 Todos", "148 Atletas", "6 Entrenadores" y "2 Administradores"
  Y ve a "Sofía Ríos" con rol "Atleta"
  Y "siguiente" navega a la página 2 usando meta.total_pages

Escenario: Alta de usuario con rol desde ADMIN
  Dado el diálogo "+ Nuevo" abierto
  Cuando registra un usuario con role "COACH"
  Entonces se envía POST /users/register con el campo role
  Y tras 201 se refresca el listado
  Y no se inicia sesión con el usuario creado

Escenario: Email duplicado en el alta
  Dado que /users/register responde 409 con USER_EMAIL_TAKEN
  Cuando se envía el formulario
  Entonces se marca el campo email como inválido
  Y se muestra el request_id para soporte

Escenario: Agenda semanal de turnos
  Dado WODs entre el lunes y el viernes en America/Asuncion
  Cuando abre /admin/schedule
  Entonces ve "Agenda de turnos", "Cada turno, bajo control." y el rango calculado
  Y ve "LUN 26" con un turno "WOD" a "20:00" y coach "Carolina Molina"
  Y "Tipo: todos" no envía un parámetro type al backend

Escenario: Crear turno con coach inválido
  Dado un coach_id de un usuario inactivo
  Cuando confirma "Crear turno"
  Entonces ve WOD_COACH_INVALID
  Y el formulario sigue abierto con los datos cargados

Escenario: Detalle con lista de espera
  Dado un WOD con max_capacity 12, confirmed_count 12 y waitlist_count 3
  Cuando abre /admin/schedule/<wod_id>
  Entonces ve "AFORO 12/12", "3 atletas" y "Lista de espera"
  Y la primera fila de espera muestra position 1

Escenario: Cancelar reserva ajena con promoción
  Dado ADMIN en el detalle del turno
  Cuando cancela una reserva confirmada y promoted es true
  Entonces ve "Se promovió a la siguiente persona de la lista de espera"
  Y el roster se refresca con cache: 'no-store'

Escenario: Subvista administrativa de membresías
  Dado un ADMIN autenticado
  Cuando abre /admin/memberships
  Entonces ve "Membresías y pagos mensuales", "Vigencias claras. Cuentas al día." y "Registrar pago"
  Y ve 130, 18, 130 y $6.240.000 con etiqueta pendiente de confirmación
  Y no presenta $6.240.000 como amount_paid de un único pago

Escenario: Registrar pago con idempotencia
  Dado el formulario "Registrar pago" con datos válidos
  Cuando se reenvía tras un error de red
  Entonces se reutiliza la misma Idempotency-Key
  Y no se crea una segunda membresía

Escenario: Transición inválida de membresía
  Dado una membresía CANCELLED
  Cuando se intenta pasar a ACTIVE
  Entonces ve MEMBERSHIP_INVALID_TRANSITION
  Y la fila conserva su estado

Escenario: Usuario sin rol ADMIN
  Dado un ATHLETE autenticado
  Cuando navega a /admin/users
  Entonces no ve el enlace en el menú
  Y al forzar la URL ve "Acceso restringido" sin pedir todas las consultas de la página
```

---

## 6. Fuente de datos

### 6.1 Contratos consumidos

| Pantalla | Endpoints | Archivo de contrato |
|----------|-----------|---------------------|
| Usuarios | `GET /users`, `GET /users/:id`, `POST /users/register` | `box-core/specs/users/api.md` |
| Agenda | `GET /wods`, `GET /users?is_active=true`, `POST /wods`, `PATCH /wods/:id`, `DELETE /wods/:id` | `box-core/specs/wods/api.md` y `users/api.md` |
| Detalle y espera | `GET /wods/:id`, `GET /wods/:id/bookings`, `DELETE /bookings/:id` | `box-core/specs/wods/api.md` y `bookings/api.md` |
| Membresías ADMIN | `GET /memberships`, `POST /memberships`, `PATCH /memberships/:id/status` | `box-core/specs/memberships/api.md` |

Todos los endpoints salvo `POST /users/register` usan JWT Bearer. En F7 el registro también se llama con token ADMIN para poder enviar `role`. El envelope es `success` / `data` / `meta` y los errores exponen `error.code` y `request_id`; ver `api.md`.

### 6.2 Datos confirmados

| Dato | Origen |
|------|--------|
| `156`, `148`, `6`, `2` | `meta.total` de cuatro llamadas a `GET /users?limit=1` |
| Filas y roles de la tabla | `UserResponseDto`: `full_name`, `email`, `role`, `created_at` |
| Cupos y aforo | `WodResponseDto`: `max_capacity`, `confirmed_count`, `available_slots`, `waitlist_count` |
| Participantes y posiciones | `GET /wods/:id/bookings`: `confirmed[]`, `waitlist[].position` |
| Listado de membresías | `MembershipResponseDto` desde `GET /memberships` |

### 6.3 Hipótesis pendientes de confirmación

| Dato de la captura | Hipótesis | Por qué no es definitivo |
|--------------------|-----------|--------------------------|
| `Molina` | `Carolina Molina` | El OCR recortó el nombre; coincide con la coach de la agenda. |
| `Ver vencidas` | Link a `/admin/memberships?status=EXPIRED` | No se sabe si refiere a membresías o a otra noción de «vencidas». |
| `Hoy, 09:12` | `created_at` del usuario | `UserResponseDto` no incluye `updated_at` ni actividad reciente. |
| `Tipo: todos` | Filtro local por título/descripción | El backend no define un campo `type` ni un enum de modalidad. |
| `Sala principal` | Texto fijo del diseño | `WodResponseDto` no tiene `location`. |
| `3 atletas` | `waitlist_count` | El aforo figura completo (`12/12`); el número no parece ser el total de participantes. |
| Iniciales `NA`, `CR`, `MS`, `JN` | Iniciales calculadas desde `full_name` | El OCR no permite asociarlas de forma fiable con los cuatro nombres visibles. |

#### Métricas de membresías ADMIN

Los rótulos de `130`, `18`, `130` y `$6.240.000` no se leyeron con fiabilidad. Se muestran los valores, pero **no se asigna un significado definitivo** hasta confirmarlo con el diseño:

| Valor | Hipótesis A | Hipótesis B | Fuente candidata |
|-------|-------------|-------------|------------------|
| `130` | Membresías `ACTIVE` | Atletas con membresía | `GET /memberships?status=ACTIVE&limit=1` / `GET /users?role=ATHLETE&limit=1` → `meta.total` |
| `18` | Membresías `EXPIRED` | Membresías `FROZEN` | `GET /memberships?status=EXPIRED&limit=1` → `meta.total` |
| `130` | Membresías con `end_date` en el mes | Total de pagos del mes | `GET /memberships?from=<YYYY-MM-DD>&to=<YYYY-MM-DD>&limit=1` → `meta.total` |
| `$6.240.000` | Suma de importes del mes | Valor agregado del plan | `GET /memberships?from&to&limit=100` → suma de `amount_paid` **solo si se paginan todas las páginas** |

Restricciones para esas hipótesis:

- `from`/`to` de `GET /memberships` filtran `end_date`, no la fecha de cobro.
- Un único registro admite `amount_paid ≤ 1 000 000`; por eso `$6.240.000` no puede ser el importe de un solo `POST /memberships`.
- No se suma solo la primera página para mostrar un total aparente.

---

## 7. Fuera de alcance

- Panel general administrativo y métricas del home: pertenecen a F3.
- Modificación de `/memberships` o de `/memberships/me`: pertenecen a F4.
- Cancelación de reservas propias: pertenece a F5; F7 solo cancela reservas ajenas desde el roster.
- Flujo de reserva de atletas: pertenece a F6.
- Edición de usuarios, baja lógica de usuarios y cambio de contraseña (el backend no expone esos endpoints).
- Reportes, exportaciones, gráficos y conciliación de cobros.
- Notificaciones efectivas, check-in, NOSHOW y reservas recurrentes.
- Definición de la sala o de la taxonomía de «Tipos» sin confirmación del contrato/diseño.
