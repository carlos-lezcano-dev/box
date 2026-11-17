# Especificaciones de Frontend — BOX

> **Fuente visual:** las 7 capturas de [`Rererences/`](./Rererences/), inventariadas en [`shared/design-reference.md`](./shared/design-reference.md). Incluyen 3 pantallas de atleta y 4 de administración. Los tokens visuales y algunas etiquetas de métricas quedan pendientes de confirmación: ver [Pendiente de confirmación](#9-pendiente-de-confirmación).
>
> **Fuente técnica:** `../box-core/specs/` (API NestJS ya implementada) y la documentación local de Next.js 16 en `node_modules/next/dist/docs/`.

**Alcance:** aplicación web Next.js 16 (App Router), React 19, TypeScript y Tailwind 4. Consume la API REST de `box-core`. No incluye backend, pasarela de pago ni notificaciones efectivas.

---

## 1. Objetivo

Convertir el diseño adjunto y los contratos de `box-core` en especificaciones ejecutables, feature por feature:

1. Qué se muestra y con qué reglas (spec).
2. Qué endpoints se consumen y cómo se mapean errores (api).
3. Cómo se implementa, con tareas marcables y Definition of Done (plan).

---

## 2. Principios rectores

| ID | Decisión |
|----|----------|
| D-FE-01 | **Server Components por defecto.** `'use client'` solo en componentes con estado, eventos o browser APIs (formularios, tabs, calendario, menú). |
| D-FE-02 | **Un solo cliente HTTP** (`src/lib/api/client.ts`) para armar URLs, adjuntar el token y desempaquetar `success/data/meta`. Ningún componente llama a `fetch` directamente contra la API. |
| D-FE-03 | **El contrato manda.** Los campos viajan en `snake_case` (`user_id`, `start_time`, `available_slots`). Se tipan en `src/types/api.ts`; no se renombran “para el frontend”. |
| D-FE-04 | **RBAC visual + real.** Ocultar botones por rol es UX; la autoridad la tiene el backend. Toda acción protegida se valida también en servidor. |
| D-FE-05 | **JWT en cookie `httpOnly`**, nunca en `localStorage`. Se escribe desde un Route Handler / Server Function; se lee con `await cookies()`. |
| D-FE-06 | **Fechas UTC desde la API, presentación en `America/Asuncion`.** El cliente formatea; no reinterpreta ISO-8601 como hora local del navegador sin convertir. |
| D-FE-07 | **Datos personales sin caché persistente:** `cache: 'no-store'` en lecturas autenticadas. |
| D-FE-08 | **Next 16 real:** `proxy.ts` (no `middleware.ts`), `params`/`searchParams` son `Promise`, `cookies()` es async, helpers globales `PageProps`/`LayoutProps`. |
| D-FE-09 | **Estados obligatorios:** loading, empty, error y success en cada lista/card visible en el diseño. |
| D-FE-10 | **Idempotencia en escrituras:** `POST /bookings` y `POST /memberships` envían `Idempotency-Key` (UUID generado por el cliente). |

---

## 3. Mapa de especificaciones

| ID | Feature | Carpeta | Pantalla / sección del diseño | Depende de | Estado |
|----|---------|---------|-------------------------------|------------|--------|
| F1 | Autenticación | [`auth/`](./auth/) | Acceso, sesión de «Lucía», rol `Atleta` | box-core `auth`, `users` | Pendiente |
| F2 | Shell de aplicación | [`app-shell/`](./app-shell/) | Marca **BOX**, sidebar, header, navegación | F1 | Pendiente |
| F3 | Panel general | [`dashboard/`](./dashboard/) | «Panel general administrativo», «BOX», métricas de operación | F1, F2 | Pendiente |
| F4 | Membresías y pagos | [`memberships/`](./memberships/) | Chip «Libre mensual» en atleta; vista ADMIN «Registrar pago» | F1, F2 | Pendiente |
| F5 | Mis reservas | [`my-bookings/`](./my-bookings/) | «Atleta · Mis reservas», «Tu entrenamiento, organizado.», «¿Cancelar tu reserva?» | F1, F2 | Pendiente |
| F6 | Explorar y reservar clases | [`classes/`](./classes/) | «Atleta · Explorar y reservar clases», «Hola, Lucía…», WOD, franjas | F1, F2, F4 | Pendiente |
| F7 | Administración | [`admin/`](./admin/) | Usuarios, Agenda de turnos, Detalle de turno, Membresías (ADMIN) | F1, F2, F6 | Pendiente |

Cada feature contiene:

```
<feature>/
├── spec.md   # qué y por qué: alcance, reglas, UX, criterios de aceptación
├── api.md    # contrato consumido: endpoints, request/response, errores
└── plan.md   # cómo: archivos, tareas, pruebas, DoD
```

Documentación transversal:

| Documento | Contenido |
|-----------|-----------|
| [`shared/conventions.md`](./shared/conventions.md) | Stack, rutas Next 16, envelope, errores, tokens visuales, i18n, accesibilidad y pruebas. |
| [`shared/design-reference.md`](./shared/design-reference.md) | Inventario de las 7 capturas, copy por pantalla y observaciones de layout. |

### Rutas canónicas

Fuente única: `src/lib/nav.ts` (F2). No se crean grupos de ruta paralelos que resuelvan la misma URL.

| Ruta | Contenido | Feature | Roles |
|------|-----------|---------|-------|
| `/` | Panel general; para otros roles redirige a `/classes` | F3 | ADMIN |
| `/classes` | Explorar y reservar clases | F6 | Todos |
| `/bookings` | Mis reservas | F5 | Todos |
| `/memberships` | Membresía propia | F4 | Todos |
| `/admin` | Hub «Administración» | F7 | ADMIN |
| `/admin/users` | Gestión de usuarios | F7 | ADMIN |
| `/admin/schedule` | Agenda de turnos | F7 | ADMIN |
| `/admin/schedule/[wodId]` | Detalle de turno y lista de espera | F7 | ADMIN |
| `/admin/memberships` | Membresías y pagos (ADMIN) | F7 | ADMIN |

> «Panel general» es `/`, **no** `/admin`. La agenda es `/admin/schedule`, **no** `/admin/wods`. `/admin` es el hub de F7.

---

## 4. Orden de implementación

| Fase | Contenido | Depende de | Entregable verificable |
|------|-----------|------------|------------------------|
| **0. Fundaciones** | Cliente API, tipos, manejo de errores, tokens Tailwind, fuentes, metadata, `proxy.ts` | — | `npm run lint`, `npm run build` y `GET /health` del backend accesible desde el cliente |
| **1. Auth + Shell** | Login, cookie de sesión, sidebar BOX, header con Lucía/Atleta | Fase 0 | Login → `/` para ADMIN o `/classes` para atleta; rutas privadas redirigen a `/login` |
| **2. Membresías** | Card «Membresías y pagos mensuales» con plan, vigencia e importe | Fase 1 | Card renderiza datos reales de `/memberships/me` |
| **3. Clases** | Agenda, franja horaria, tarjeta «Fuerza + metcon», reserva/waitlist | Fase 1–2 | Reserva con cupo y sin cupo visibles en UI |
| **4. Mis reservas** | Listado, posición de waitlist, cancelación con confirmación | Fase 3 | Cancelar actualiza lista y refleja promoción |
| **5. Panel general** | Dashboard administrativo con métricas de operación | Fase 1–4 | Panel general en `/` con contadores reales |
| **6. Administración** | Usuarios, agenda de turnos, detalle de turno y registro de pagos | Fase 2–4 | ABM operativo según rol ADMIN |
| **7. Endurecimiento** | Accesibilidad, responsive, tests E2E, estados de error, performance | Fase 1–6 | Pipeline en verde y checklist visual completo |

**Regla:** no avanzar de fase sin que la anterior tenga sus tareas `[x]` y sus pruebas en verde.

---

## 5. Flujo de trabajo

1. Leer [`shared/conventions.md`](./shared/conventions.md) antes de tocar código.
2. Implementar la feature siguiendo su `plan.md` en orden.
3. Cada tarea terminada se marca `[x]` en el `plan.md`.
4. Si el contrato de `api.md` debe cambiar, **primero se actualiza `api.md`** y se anota la razón; el backend `box-core` es la fuente de verdad.
5. Ninguna pantalla se da por terminada sin sus cuatro estados (loading / empty / error / success).
6. Al cerrar la feature, actualizar su estado en la tabla del mapa.

---

## 6. Catálogo de requisitos frontend

### Funcionales

| ID | Requisito | Prioridad | Feature |
|----|-----------|-----------|---------|
| RF-FE-01 | Iniciar sesión con email/contraseña y persistir la sesión de forma segura. | Must | F1 |
| RF-FE-02 | Redirigir a `/login` las rutas privadas sin sesión. | Must | F1 |
| RF-FE-03 | Mostrar marca BOX, navegación lateral y usuario/rol en el shell. | Must | F2 |
| RF-FE-04 | Mostrar el panel general administrativo con contadores y próximos turnos. | Must | F3 |
| RF-FE-05 | Mostrar membresía vigente, plan, importe y días restantes. | Must | F4 |
| RF-FE-06 | Listar reservas propias con estado `CONFIRMED` / `WAITLIST` y posición. | Must | F5 |
| RF-FE-07 | Cancelar una reserva con confirmación y feedback de promoción. | Must | F5 |
| RF-FE-08 | Explorar turnos por día, mostrar «Hola, {nombre}…» y reservar con cupo o entrar en waitlist. | Must | F6 |
| RF-FE-09 | Bloquear reserva y explicar por qué si no hay membresía vigente. | Must | F6 |
| RF-FE-10 | Gestionar usuarios, turnos, membresías y pagos según rol ADMIN. | Should | F7 |

> F7 desglosa RF-FE-10 en RF-FE-10 a RF-FE-13 como propuesta; el alta formal de esos IDs queda fuera de este cambio.

### No funcionales

| ID | Requisito | Objetivo |
|----|-----------|----------|
| RNF-FE-01 | Carga inicial del dashboard | LCP < 2,5 s en red local |
| RNF-FE-02 | Accesibilidad | WCAG 2.2 AA en componentes interactivos |
| RNF-FE-03 | Responsive | Sidebar colapsable < 1024 px; tarjetas apiladas < 768 px |
| RNF-FE-04 | Seguridad | Token nunca en stored JS; errores sin stack traces |
| RNF-FE-05 | Cobertura | ≥ 80 % en lógica de `src/lib` y componentes críticos |
| RNF-FE-06 | Consistencia visual | Sin valores de color espaciado hardcodeados fuera de tokens |

---

## 7. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| El OCR mezcló labels con valores | Cards con datos incorrectos | Confirmar mapeo de métricas en F3/F7 antes de codificar |
| Las etiquetas de las métricas no se leyeron | Contadores mal interpretados | Mantenerlos como hipótesis en `shared/design-reference.md` y validar antes de cablear |
| `GET /users` es solo ADMIN | Dashboard ATHLETE rompe | F3 se monta solo para ADMIN; otros roles redirigen a `/classes` y no piden `/users` |
| Doble submit de reserva | Reservas duplicadas | `Idempotency-Key` + deshabilitar botón durante la request |
| Token expirado durante navegación | Pantalla rota | Interceptor 401 → limpiar cookie → redirect `/login` |
| Zona horaria del navegador ≠ box | Turnos “fuera de día” | Convertir a `America/Asuncion` con helper único |
| Dos features resuelvan la misma ruta | Build roto o pantalla duplicada | Mapa de rutas canónico en §3; un solo `page.tsx` por ruta |

---

## 8. Definition of Done global

- [ ] `spec.md`, `api.md` y `plan.md` de la feature actualizados.
- [ ] Tareas del `plan.md` marcadas `[x]`.
- [ ] Copy exacto de la captura en los textos visibles.
- [ ] Cuatro estados (loading/empty/error/success) implementados.
- [ ] Errores mapeados por `error.code`, no por mensaje.
- [ ] Navegación por teclado y `aria-*` en controles interactivos.
- [ ] `npm run lint` y `npm run build` en verde.
- [ ] Pruebas unitarias y E2E de la feature en verde.

---

## 9. Pendiente de confirmación

1. **Etiquetas de métricas:** el OCR leyó valores (`148`, `86`, `72%`, `10:12`, `76%`, `130`, `18`, `$6.240.000`) pero no sus rótulos. Ver [`shared/design-reference.md`](./shared/design-reference.md).
2. **Colores y tipografía exactos:** el muestreo sugiere acento azul y lima sobre fondo claro; confirmar antes de fijar tokens en `app/globals.css`.
3. **Copy de detalle de turno:** «Sala principal» y algunos nombres de participantes pueden tener erratas de OCR; validar con el diseño.
4. **Alcance de COACH:** si ve enlaces administrativos y si puede consultar el roster de sus turnos; en v1 se asume «no».
