# Convenciones de Frontend

**Feature:** transversal
**Aplica a:** todas las features de `box/specs`
**Estado:** propuesto

---

## 1. Stack y versiones instaladas

| Capa | Tecnología |
|------|------------|
| Framework | Next.js `16.4.6` (App Router) |
| UI | React `19.3.0` |
| Lenguaje | TypeScript `strict` |
| Estilos | Tailwind CSS `4.3.3` (`@import "tailwindcss"`) |
| Fuente | Geist / Geist Mono vía `next/font/google` |
| Backend | `box-core` en `http://localhost:3000/api/v1` (configurable por `NEXT_PUBLIC_API_URL`) |

> Antes de escribir código, leer la documentación local correspondiente en `node_modules/next/dist/docs/`. Las reglas de esta sección ya están contrastadas con esa documentación.

---

## 2. Reglas de Next.js 16 que aplican

| Tema | Regla |
|------|-------|
| Componentes | `page.tsx` y `layout.tsx` son Server Components por defecto. Agregar `'use client'` solo al archivo que necesita estado/eventos/browser APIs. |
| Props dinámicas | `params` y `searchParams` son `Promise`. Usar `await props.params` / `await props.searchParams` o `use()` en Client Components. Usar los helpers globales `PageProps<'/ruta'>` y `LayoutProps<'/ruta'>`. |
| Rutas | Agrupar solo con `(auth)` y `(app)`: los paréntesis **no** aparecen en la URL. El segmento `/admin/**` vive dentro de `(app)` con su propio `layout.tsx` de rol. Evitar que dos grupos resuelvan la misma ruta. |
| Middleware | El archivo se llama `proxy.ts` y exporta `proxy()` (o default). `middleware.ts` está deprecado. |
| Cookies | `await cookies()` en Server Components/Route Handlers. Escribir cookies solo en Route Handlers o Server Functions. Usar `httpOnly`, `secure` en producción y `sameSite: 'lax'`. |
| Fetch en servidor | Lecturas autenticadas con `cache: 'no-store'`. No mezclar `revalidate` con `cache: 'no-store'`. El mismo `fetch` GET se memoiza dentro de un render pass. |
| Metadata | `export const metadata` en `layout.tsx`; no agregar `<head>` manual. |
| Imágenes | Usar `next/image` con `width`/`height` o `fill`. |

---

## 3. Estructura de carpetas objetivo

```
app/
├── layout.tsx                      # root: html/body, fuentes, metadata global
├── globals.css                     # @import tailwind + tokens
├── proxy.ts                        # (F1) redirect de rutas privadas
├── (auth)/
│   └── login/page.tsx              # F1
├── (app)/
│   ├── layout.tsx                  # F2: sidebar + header + loading/error
│   ├── page.tsx                    # F3: panel general (/) — ADMIN; otros roles → /classes
│   ├── memberships/page.tsx        # F4 (vista de atleta)
│   ├── bookings/page.tsx           # F5
│   ├── classes/page.tsx            # F6
│   └── admin/                      # F7: guard de rol ADMIN en su layout
│       ├── layout.tsx
│       ├── page.tsx                # hub «Administración» (/admin)
│       ├── users/page.tsx          # /admin/users
│       ├── schedule/page.tsx       # /admin/schedule (agenda)
│       ├── schedule/[wodId]/page.tsx # detalle + roster
│       └── memberships/page.tsx    # /admin/memberships (registro de pagos)
api/
└── auth/
    ├── login/route.ts              # F1: set-cookie httpOnly
    └── logout/route.ts             # F1: delete cookie
src/
├── api/
│   ├── client.ts                   # fetch + envelope + errores
│   ├── auth.ts
│   ├── users.ts
│   ├── memberships.ts
│   ├── wods.ts
│   └── bookings.ts
├── components/
│   ├── layout/                     # Sidebar, Header, UserChip
│   ├── ui/                         # Card, Button, Badge, Skeleton, EmptyState
│   └── features/                   # componentes por feature
├── hooks/                          # useBookingAction, useCountdown, etc.
├── lib/
│   ├── errors.ts                   # ApiError + mapa de códigos
│   ├── datetime.ts                 # UTC -> America/Asuncion
│   ├── idempotency.ts              # crypto.randomUUID()
│   └── session.ts                  # lectura de cookie
└── types/
    └── api.ts                      # DTOs snake_case del backend
```

---

## 4. Cliente HTTP y envelope

Toda respuesta del backend sigue [`box-core/specs/shared/conventions.md`](../../../box-core/specs/shared/conventions.md):

```ts
type SuccessEnvelope<T> = {
  success: true
  data: T
  meta?: { page: number; limit: number; total: number; total_pages: number }
  message?: string
}

type ErrorEnvelope = {
  success: false
  error: { code: string; message: string; details?: Array<{ field: string; rule: string; message: string }> }
  request_id: string
}
```

Reglas del cliente:

1. `apiClient<T>(path, init)` anteponer `/api/v1`, serializar JSON y adjuntar `Authorization: Bearer` leído de la cookie de sesión en servidor.
2. Si `!response.ok` o `success === false`, lanzar `ApiError` con `code`, `status`, `message`, `request_id`.
3. Los componentes nunca comparan strings de mensaje: comparan `error.code`.
4. Errores de validación (400) se pasan al formulario por `field`; el resto se muestra en un `Alert`.
5. `401` → limpiar sesión y redirigir a `/login`. `403` con `MEMBERSHIP_REQUIRED` → estado específico “sin membresía” con CTA (no un error genérico). `429` → mostrar segundos de `Retry-After`.
6. `POST /bookings` y `POST /memberships` incluyen `Idempotency-Key` estable por intención de usuario (se genera una vez al abrir la acción y se reutiliza en reintentos).

---

## 5. Convenciones de datos

| Aspecto | Regla |
|---------|-------|
| Nombres | `snake_case` en todos los DTO (`user_id`, `full_name`, `start_time`, `available_slots`, `waitlist_position`). |
| IDs | UUID opacos; nunca se construyen ni se parsean como número. |
| Datetime | ISO-8601 UTC con `Z`. Formatear con `Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', ... })`. |
| Fechas de membresía | `YYYY-MM-DD`; `end_date` es inclusivo. |
| Moneda | El backend envía número. Formatear con `Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 })`. |
| Booleanos | `true`/`false`; para mostrar “Sí/No” usar helper, no comparar con `1`. |
| Enums | `ATHLETE`/`COACH`/`ADMIN`, `CONFIRMED`/`WAITLIST`/`CANCELLED`, `ACTIVE`/`EXPIRED`/`FROZEN`/`CANCELLED`. Etiquetas en español solo en la capa visual. |

---

## 6. Tokens visuales (a confirmar con la captura)

El OCR recuperó el contenido y una muestra aproximada de color (ver [`design-reference.md`](./design-reference.md)): fondo `#F0F0F0`, superficies oscuras `#101010`–`#202020`, acento azul `#1090F0` y acento lima `#C0F060`. Se usan tokens semánticos; los valores concretos se confirman con el diseño antes de fijarlos.

| Token | Uso estimado | Estado |
|-------|--------------|--------|
| `--color-brand` | Marca **BOX** / acentos | Valor a confirmar |
| `--color-brand-foreground` | Texto sobre acento | Valor a confirmar |
| `--color-surface` | Fondo de tarjetas | Valor a confirmar |
| `--color-surface-muted` | Fondo de sección / sidebar | Valor a confirmar |
| `--color-border` | Bordes sutiles | Valor a confirmar |
| `--color-text` | Texto principal | Valor a confirmar |
| `--color-text-muted` | Subtítulos («Tu entrenamiento, organizado.») | Valor a confirmar |
| `--color-success` | «Libre», cupo disponible | Valor a confirmar |
| `--color-warning` | Waitlist, membresía por vencer | Valor a confirmar |
| `--radius-card` | Esquinas de tarjetas | Valor a confirmar |
| `--shadow-card` | Elevación de tarjetas | Valor a confirmar |

Reglas:

- Definir los tokens en `app/globals.css` bajo `@theme inline` y usar clases Tailwind derivadas (`bg-surface`, `text-muted`, etc.). No hardcodear hex en componentes.
- Sidebar fijo en desktop; en < 1024 px se colapsa y se abre con un botón `aria-expanded`.
- Mantener contraste AA para textos sobre superficies.

---

## 7. Copy del diseño (textos a respetar)

| Texto | Dónde | Feature |
|-------|-------|---------|
| `BOX` | Marca en sidebar/header | F2 |
| `BOX` | Nombre visible en el panel general | F3 |
| `Panel general administrativo` | Título del dashboard admin | F3 |
| `Todo listo para un día más fuerte.` | Subtítulo del panel general | F3 |
| `Atleta · Explorar y reservar clases` | Encabezado del explorador | F6 |
| `Hola, Lucía. Elegí tu próximo turno.` | Saludo del explorador | F6 |
| `Octubre 2026`, `Hoy, 27`, `Hoy, 19:00` | Selector de día/franja | F6 |
| `12:30`, `17:00`, `18:00`, `19:00`, `20:00` | Horarios | F6 |
| `Libre mensual` | Chip de membresía en pantallas de atleta | F4, F5, F6 |
| `Membresías y pagos mensuales` | Título de la vista de membresías | F4, F7 |
| `Vigencias claras. Cuentas al día.` | Subtítulo de membresías | F4, F7 |
| `$6.240.000` | Importe visible | F4, F7 |
| `Registrar pago` | Acción ADMIN | F7 |
| `Atleta · Mis reservas` | Encabezado | F5 |
| `Tu entrenamiento, organizado.` | Subtítulo de F5 | F5 |
| `Reservas confirmadas`, `Lista de espera` | Agrupadores de reservas | F5, F7 |
| `¿Cancelar tu reserva?` | Confirmación | F5 |
| `Fuerza + metcon`, `WOD` | Tarjeta de clase / turno | F6, F7 |
| `Libre` | Estado de cupo | F6 |
| `Gestión de usuarios`, `El motor del box.` | Vista de usuarios | F7 |
| `Cada turno, bajo control.` | Agenda de turnos | F7 |
| `AFORO 12/12`, `Participantes`, `Equipo` | Detalle de turno | F7 |
| `Atleta` | Rol de usuario en header | F1/F2 |

> «Lucía» y «Atleta» son datos de ejemplo del diseño; en producción salen de `GET /users/me`.

---

## 8. Accesibilidad e interacción

- Todo botón con texto visible o `aria-label`. El botón de menú lleva `aria-controls` y `aria-expanded`.
- Navegación activa marcada con `aria-current="page"`.
- Cargas con `role="status"` + `aria-live="polite"`; errores con `role="alert"`.
- Modales de confirmación: `role="dialog"`, `aria-modal`, foco inicial y cierre con `Escape`.
- No depender solo de color para «Libre» / «Lista de espera»: incluir texto o icono con `aria-hidden`.
- Formularios: `<label htmlFor>`, `aria-invalid` y `aria-describedby` en errores de campo.

---

## 9. Pruebas

| Nivel | Herramienta propuesta | Alcance |
|-------|-----------------------|---------|
| Unitarias | Vitest + Testing Library | `src/lib`, mappers, formateo de fechas/monedas, `ApiError` |
| Componentes | Testing Library | Cards, badges, estados empty/error, confirmación de cancelación |
| E2E | Playwright | Login → dashboard → reservar → cancelar; RBAC; 401 → redirect |
| Accesibilidad | `@axe-core/playwright` | Pantallas F1–F7 |

Convenciones:

- Los tests de componentes usan datos `snake_case` idénticos a la API.
- Las fechas se fijan con una fecha de referencia para evitar dependencia del reloj real.
- Ningún test apunta al backend real salvo el smoke de E2E contra `box-core` levantado con Docker.

---

## 10. Definition of Done transversal

- [ ] Sin `fetch` directo a la API fuera de `src/api/`.
- [ ] Sin `localStorage` para tokens ni datos sensibles.
- [ ] Sin `middleware.ts`; se usa `proxy.ts`.
- [ ] `params`/`searchParams` tratados como promesas.
- [ ] Errores manejados por `error.code`.
- [ ] Cuatro estados implementados en cada sección visible.
- [ ] Copy de la sección 7 verificado.
- [ ] `npm run lint` y `npm run build` sin errores.
