# Plan de implementación — Autenticación

**Feature ID:** F1
**Estado:** pendiente
**Estimación:** 1 día
**Precondición:** Fase 0 de `specs/README.md` (cliente API, tipos y tokens)

---

## 1. Archivos a crear

```
proxy.ts
api/auth/login/route.ts
api/auth/logout/route.ts
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

- [ ] Definir `NEXT_PUBLIC_API_URL` en `.env.example` y documentarlo en el README del proyecto.
- [ ] Crear `src/types/api.ts` con `LoginRequest`, `LoginResponse`, `CurrentUser`, `SuccessEnvelope`, `ErrorEnvelope`.
- [ ] Crear `src/api/client.ts` con prefijo `/api/v1`, headers, `ApiError` y desempaquetado de envelope.
- [ ] Crear `src/lib/errors.ts` con el mapa `AUTH_INVALID_CREDENTIALS`, `AUTH_USER_INACTIVE`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`.
- [ ] Crear `src/lib/session.ts`: `getSessionToken()` usando `await cookies()` y `SESSION_COOKIE = 'box_session'`.

### 2.2 Route Handlers

- [ ] `POST /api/auth/login`: validar body mínimo, llamar a `login()`, setear cookie `httpOnly` con `expires_in`, responder sin el token.
- [ ] `POST /api/auth/logout`: `cookies().delete('box_session')` y responder `{ ok: true }`.
- [ ] Marcar ambas rutas con `Cache-Control: no-store`.

### 2.3 Protección de rutas

- [ ] Crear `proxy.ts` en la raíz (no `middleware.ts`) exportando `proxy()`.
- [ ] Configurar `matcher` que excluya `api`, `_next/static`, `_next/image`, `favicon.ico` y `login`.
- [ ] Si no hay cookie `box_session`, redirigir a `/login?next=<pathname+search>`.
- [ ] Si hay cookie y la ruta es `/login`, redirigir a `/` (se hace en la página, no en proxy, para evitar bucles).

### 2.4 Pantalla de login

- [ ] `app/(auth)/layout.tsx`: fondo limpio, centra el formulario, metadata «Ingresar — BOX».
- [ ] `login-form.tsx` como Client Component con `useActionState` o `useState` + `isPending`.
- [ ] Campos `email` (type=email, autocomplete=username) y `password` (autocomplete=current-password).
- [ ] Validación local: required y trim de email; deshabilitar submit mientras envía.
- [ ] Enviar a `POST /api/auth/login` local y luego `router.replace(next ?? '/')` + `router.refresh()`.
- [ ] Mostrar alertas por `error.code`; en `429` usar `Retry-After`.
- [ ] Respetar el `next` recuperado de `searchParams` (Promise en Next 16; usar `use(searchParams)` si es Client Component).

### 2.5 Header / perfil

- [ ] `src/api/users.ts` con `getMe()` usando `cache: 'no-store'`.
- [ ] Función `requireUser()` en `src/lib/session.ts` que llama a `getMe()` y lanza `UnauthorizedError` si falla.
- [ ] Proveer el usuario al layout de `(app)` en F2 (no duplicar la llamada por página).

---

## 3. Pruebas

### Unitarias

- [ ] `ApiError` expone `code`, `status`, `message`, `request_id`.
- [ ] `client.ts` desempaqueta `success/data` y lanza ante `success: false`.
- [ ] `getSessionToken()` devuelve el valor de la cookie y `null` si falta.
- [ ] `login-form` deshabilita el botón durante `isPending`.
- [ ] `login-form` muestra mensaje distinto para `AUTH_INVALID_CREDENTIALS` y `AUTH_USER_INACTIVE`.

### E2E (`tests/e2e/auth.spec.ts`)

- [ ] Login válido → cookie presente → redirect `/`.
- [ ] Login inválido → permanece en `/login` → sin cookie.
- [ ] Usuario inactivo → mensaje específico.
- [ ] `/bookings` sin sesión → `/login?next=/bookings`.
- [ ] Tras login con `next`, vuelve a `/bookings`.
- [ ] Expirar/eliminar cookie manualmente → siguiente navegación redirect.
- [ ] Cerrar sesión elimina la cookie y vuelve a `/login`.

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

- [ ] No existe `localStorage` con tokens en el código.
- [ ] No existe `middleware.ts`.
- [ ] La cookie es `httpOnly`, `secure` en producción y expira con `expires_in`.
- [ ] El JWT no aparece en props, logs ni HTML.
- [ ] 401 limpia sesión y redirige.
- [ ] Copy de errores probado por `code`.
- [ ] `npm run lint` y `npm run build` en verde.

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Bucle redirect `/login` ↔ `/` | La redirección de usuario autenticado se hace en la página, no en `proxy.ts` |
| Cookie `secure` en local bloquea login | Activar `secure` solo cuando `NODE_ENV === 'production'` |
| `next` abierto → phishing | Validar que `next` empiece con `/` y no con `//` |
| HMR cachea `/users/me` | Usar `cache: 'no-store'` y `router.refresh()` tras login |
