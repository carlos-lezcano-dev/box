# Feature: Autenticación

**Feature ID:** F1
**Carpeta de implementación:** `app/(auth)/`, `api/auth/`, `proxy.ts`, `src/api/auth.ts`
**Requisitos:** RF-FE-01, RF-FE-02
**Depende de:** `box-core` `POST /api/v1/auth/login`, `GET /api/v1/users/me`
**Habilita:** todas las rutas privadas del frontend

---

## 1. Alcance

| Requisito | Pantalla / mecanismo | Origen |
|-----------|----------------------|--------|
| RF-FE-01 | Formulario de login | Derivado del diseño (usuario «Lucía», rol `Atleta`) |
| RF-FE-02 | `proxy.ts` + cookie de sesión | Derivado del RFC / API del backend |

**No incluye:** registro público, recuperación de contraseña, refresh token, 2FA, logout con revocación (v1 solo descarta la cookie).

---

## 2. Actores

| Actor | Puede |
|-------|-------|
| Visitante | Ver `/login`, enviar credenciales |
| `ATHLETE` / `COACH` / `ADMIN` | Acceder al shell y a las rutas según rol |
| Usuario inactivo | No autenticarse (backend responde `AUTH_USER_INACTIVE`) |

---

## 3. Reglas de negocio / UX

| ID | Regla |
|----|-------|
| RN-FE-AUTH-01 | El formulario tiene `email` y `password`; ambos requeridos; el botón se deshabilita mientras envía. |
| RN-FE-AUTH-02 | El email se envía tal cual; la normalización la hace el backend. El frontend solo aplica `trim()` visual. |
| RN-FE-AUTH-03 | Éxito → la API de Next escribe una cookie `httpOnly` con el `access_token` y redirige a `/` (o a la ruta solicitada originalmente). |
| RN-FE-AUTH-04 | El JWT **nunca** se guarda en `localStorage`, `sessionStorage` ni en estado global persistido. |
| RN-FE-AUTH-05 | `proxy.ts` redirige a `/login?next=<ruta>` si no hay cookie de sesión en rutas privadas. Las rutas públicas y estáticos quedan fuera del matcher. |
| RN-FE-AUTH-06 | Un `401` en cualquier petición limpia la cookie y redirige a `/login`. |
| RN-FE-AUTH-07 | Los errores se muestran por `error.code`: credenciales, inactivo, rate limit. El mensaje del backend se muestra tal cual (está en español). |
| RN-FE-AUTH-08 | `429` muestra el tiempo restante usando `Retry-After`, no un texto fijo. |
| RN-FE-AUTH-09 | Después de login se llama a `GET /users/me` para hidratar nombre, email y rol del header. |
| RN-FE-AUTH-10 | El botón «Cerrar sesión» elimina la cookie y vuelve a `/login`. No revoca el JWT en el servidor (fuera de alcance). |
| RN-FE-AUTH-11 | Si el usuario ya autenticado visita `/login`, se redirige a `/`. |

---

## 4. Flujo

```
1. Visitante abre /login
2. Completa email + password y envía
3. src/api/auth.login() -> POST /api/v1/auth/login
4. Si error -> mapear code y mostrar alerta
5. Si ok -> POST /api/auth/login (Route Handler local)
     5.1 escribe cookie httpOnly con access_token
6. GET /users/me con la cookie -> guarda perfil en el server
7. redirect(next ?? '/')
```

> `/` no es un destino fijo: `app/(app)/page.tsx` (F3) muestra el panel para ADMIN y redirige a `/classes` para ATHLETE/COACH. El `next` explícito (por ejemplo `/bookings`) tiene prioridad y no se reescribe.

### Protección de rutas

```
proxy.ts
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)']
  si no hay cookie box_session -> NextResponse.redirect('/login?next=...')
  si hay cookie -> NextResponse.next()
```

> Según la doc de Next 16, `proxy.ts` se ubica al mismo nivel que `app/`, exporta `proxy()` y usa `config.matcher` constante. `middleware.ts` está deprecado.

---

## 5. Modelo de datos (estado en el cliente)

| Dato | Origen | Persistencia |
|------|--------|--------------|
| `access_token` | `POST /auth/login` | Cookie `httpOnly` `box_session` |
| `expires_in` | `POST /auth/login` | Solo para calcular expiración visual; no decide autoridad |
| `user` (user_id, email, full_name, role) | `GET /users/me` | Memoria del Server Component por request |

No se crea tabla ni modelo nuevo en el frontend.

---

## 6. Casos borde

| Caso | Resultado |
|------|-----------|
| Email o password vacíos | Validación local; no se llama a la API |
| `AUTH_INVALID_CREDENTIALS` | Alerta «El email o la contraseña son incorrectos.» |
| `AUTH_USER_INACTIVE` | Alerta específica; no redirige |
| `RATE_LIMITED` | Alerta con segundos de `Retry-After` |
| Token expirado en navegación | Interceptor 401 → logout local → `/login?next=...` |
| Cookie presente pero perfil 401 | Limpiar cookie y redirigir |
| Usuario con rol `COACH`/`ADMIN` | Entra al mismo shell de F2; las rutas protegidas se validan en el backend |
| Doble submit | Botón deshabilitado + flag `isPending` |

---

## 7. Criterios de aceptación

```gherkin
Escenario: Login exitoso
  Dado un visitante en /login
  Cuando ingresa credenciales válidas
  Entonces se crea la cookie httpOnly box_session
  Y es redirigido a /
  Y el header muestra "Hola, Lucía" y el rol "Atleta"

Escenario: Credenciales inválidas
  Dado un visitante en /login
  Cuando ingresa una contraseña incorrecta
  Entonces ve el mensaje del backend para AUTH_INVALID_CREDENTIALS
  Y no se crea ninguna cookie

Escenario: Ruta privada sin sesión
  Dado un visitante sin cookie
  Cuando abre /bookings
  Entonces es redirigido a /login?next=/bookings

Escenario: Token expirado
  Dado un usuario navegando con token vencido
  Cuando cualquier petición responde 401
  Entonces se elimina la cookie
  Y es redirigido a /login

Escenario: Usuario inactivo
  Dado un usuario is_active=false con password correcta
  Cuando intenta ingresar
  Entonces ve el error AUTH_USER_INACTIVE
  Y permanece en /login
```

---

## 8. Requisitos no funcionales

- La cookie se configura con `maxAge = expires_in`, `path: '/'`, `sameSite: 'lax'`, `httpOnly: true` y `secure` cuando `NODE_ENV === 'production'`.
- `/login` no cachea respuesta (`Cache-Control: no-store`).
- Las credenciales no se loguean ni quedan en la URL.

---

## 9. Fuera de alcance

- Registro desde el frontend (el backend ya expone `POST /users/register`, pero no aparece en el diseño).
- Refresh token y renovación silenciosa.
- Recuperación de contraseña.
- Logout con blacklist del JWT.
