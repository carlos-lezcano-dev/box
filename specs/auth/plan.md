# Plan de implementación — Autenticación

**Feature ID:** F1
**Estado:** completo
**Estimación:** 1 día
**Precondición:** Fase 0 de `specs/README.md` (cliente API, tipos y tokens)

---

## 1. Archivos a crear

```
proxy.ts
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
app/(auth)/login/page.tsx
app/(auth)/layout.tsx
src/api/auth.ts
src/api/users.ts
src/lib/session.ts
src/types/api.ts
src/components/features/auth/login-form.tsx
src/components/features/auth/login-form.spec.tsx
src/lib/errors.spec.ts
tests/e2e/auth.spec.ts
```

---

## 2. Tareas

### 2.1 Fundaciones

- [x] Definir `NEXT_PUBLIC_API_URL` en `.env.example` y documentarlo en el README del proyecto.
- [x] Crear `src/types/api.ts` con `LoginRequest`, `LoginResponse`, `CurrentUser`, `SuccessEnvelope`, `ErrorEnvelope`.
- [x] Crear `src/api/client.ts` con prefijo `/api/v1`, headers, `ApiError` y desempaquetado de envelope.
- [x] Crear `src/lib/errors.ts` con el mapa `AUTH_INVALID_CREDENTIALS`, `AUTH_USER_INACTIVE`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`.
- [x] Crear `src/lib/session.ts`: `getSessionToken()` usando `await cookies()` y `SESSION_COOKIE = 'box_session'`.

### 2.2 Route Handlers

- [x] `POST /api/auth/login`: validar body mínimo, llamar a `login()`, setear cookie `httpOnly` con `expires_in`, responder sin el token.
- [x] `POST /api/auth/logout`: `cookies().delete('box_session')` y responder `{ ok: true }`.
- [x] Marcar ambas rutas con `Cache-Control: no-store`.

### 2.3 Protección de rutas

- [x] Crear `proxy.ts` en la raíz (no `middleware.ts`) exportando `proxy()`.
- [x] Configurar `matcher` que excluya `api`, `_next/static`, `_next/image`, `favicon.ico` y `login`.
- [x] Si no hay cookie `box_session`, redirigir a `/login?next=<pathname+search>`.
- [x] Si hay cookie y la ruta es `/login`, redirigir a `/` (se hace en la página, no en proxy, para evitar bucles).

### 2.4 Pantalla de login

- [x] `app/(auth)/layout.tsx`: fondo limpio, centra el formulario, metadata «Ingresar — BOX».
- [x] `login-form.tsx` como Client Component con `useActionState` o `useState` + `isPending`.
- [x] Campos `email` (type=email, autocomplete=username) y `password` (autocomplete=current-password).
- [x] Validación local: required y trim de email; deshabilitar submit mientras envía.
- [x] Enviar a `POST /api/auth/login` local y luego `router.replace(next ?? '/')` + `router.refresh()`.
- [x] Mostrar alertas por `error.code`; en `429` usar `Retry-After`.
- [x] Respetar el `next` recuperado de `searchParams` (Promise en Next 16; usar `use(searchParams)` si es Client Component).

### 2.5 Header / perfil

- [x] `src/api/users.ts` con `getMe()` usando `cache: 'no-store'`.
- [x] Función `requireUser()` en `src/lib/session.ts` que llama a `getMe()` y lanza `UnauthorizedError` si falla.
- [x] Proveer el usuario al layout de `(app)` en F2 (no duplicar la llamada por página).

---

## 3. Pruebas

### Unitarias

- [x] `ApiError` expone `code`, `status`, `message`, `request_id`.
- [x] `client.ts` desempaqueta `success/data` y lanza ante `success: false`.
- [x] `getSessionToken()` devuelve el valor de la cookie y `null` si falta.
- [x] `login-form` deshabilita el botón durante `isPending`.
- [x] `login-form` muestra mensaje distinto para `AUTH_INVALID_CREDENTIALS` y `AUTH_USER_INACTIVE`.

### E2E (`tests/e2e/auth.spec.ts`)

- [x] Login válido → cookie presente → redirect `/`.
- [x] Login inválido → permanece en `/login` → sin cookie.
- [x] Usuario inactivo → mensaje específico.
- [x] `/bookings` sin sesión → `/login?next=/bookings`.
- [x] Tras login con `next`, vuelve a `/bookings`.
- [x] Expirar/eliminar cookie manualmente → siguiente navegación redirect.
- [x] Cerrar sesión elimina la cookie y vuelve a `/login`.

---

## 4. Orden de ejecución

1. Tipos + cliente + errores + sesión.
2. Route Handlers de login/logout.
3. `proxy.ts` y prueba de redirect.
4. Formulario de login y validaciones.
5. `getMe()` + `requireUser()`.
6. E2E completo.

---

## 5. Definition of Done

- [x] No existe `localStorage` con tokens en el código.
- [x] No existe `middleware.ts`.
- [x] La cookie es `httpOnly`, `secure` en producción y expira con `expires_in`.
- [x] El JWT no aparece en props, logs ni HTML.
- [x] 401 limpia sesión y redirige.
- [x] Copy de errores probado por `code`.
- [x] `npm run lint` y `npm run build` en verde.

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Bucle redirect `/login` ↔ `/` | La redirección de usuario autenticado se hace en la página, no en `proxy.ts` |
| Cookie `secure` en local bloquea login | Activar `secure` solo cuando `NODE_ENV === 'production'` |
| `next` abierto → phishing | Validar que `next` empiece con `/` y no con `//` |
| HMR cachea `/users/me` | Usar `cache: 'no-store'` y `router.refresh()` tras login |
