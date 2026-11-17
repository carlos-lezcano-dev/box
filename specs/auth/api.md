# API — Autenticación (consumo desde frontend)

**Base URL:** `NEXT_PUBLIC_API_URL` (default `http://localhost:3000/api/v1`)
**Contrato backend:** [`box-core/specs/auth/api.md`](../../../box-core/specs/auth/api.md)

---

## 1. Endpoints consumidos

| Método | Ruta | Cuándo | Auth |
|--------|------|--------|------|
| `POST` | `/auth/login` | Enviar formulario de login | Pública |
| `GET` | `/users/me` | Hidratar perfil tras login y en cada carga del shell | Cookie de sesión |

---

## 2. `POST /auth/login`

### Request

```ts
type LoginRequest = {
  email: string
  password: string
}
```

### Response `200`

```ts
type LoginResponse = {
  success: true
  data: {
    access_token: string
    token_type: 'Bearer'
    expires_in: number
    user: {
      user_id: string
      email: string
      full_name: string
      role: 'ATHLETE' | 'COACH' | 'ADMIN'
    }
  }
}
```

Mapeo en el frontend:

| Campo API | Uso |
|-----------|-----|
| `access_token` | Se escribe en la cookie `httpOnly` del Route Handler local |
| `expires_in` | `maxAge` de la cookie; se descarta después |
| `user.full_name` | Saludo del header (`Hola, Lucía`) |
| `user.role` | Etiqueta «Atleta» y adaptación del menú |

### Errores gestionados

| HTTP | `code` | Acción en UI |
|------|--------|--------------|
| 400 | `VALIDATION_ERROR` | Marcar campos con `aria-invalid` |
| 401 | `AUTH_INVALID_CREDENTIALS` | Alerta genérica de credenciales |
| 403 | `AUTH_USER_INACTIVE` | Alerta específica; no redirigir |
| 429 | `RATE_LIMITED` | Alerta con segundos de `Retry-After` |
| 503 | `SERVICE_UNAVAILABLE` | Alerta «Servicio no disponible, intentá más tarde» |

---

## 3. `GET /users/me`

### Response `200`

```ts
type CurrentUser = {
  success: true
  data: {
    user_id: string
    email: string
    full_name: string
    phone: string | null
    emergency_contact: string | null
    role: 'ATHLETE' | 'COACH' | 'ADMIN'
    is_active: boolean
    created_at: string
  }
}
```

### Errores gestionados

| HTTP | `code` | Acción |
|------|--------|--------|
| 401 | `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` | Limpiar cookie y redirect `/login?next=...` |
| 403 | `AUTH_USER_INACTIVE` | Cerrar sesión local y mostrar motivo |

---

## 4. Rutas de Next (BFF.local)

Estas rutas no existen en el backend; son el puente seguro para escribir la cookie.

### `POST /api/auth/login`

- Body: `{ email, password }`.
- Llama a `POST /api/v1/auth/login`.
- Si ok: `cookies().set('box_session', access_token, { httpOnly: true, sameSite: 'lax', secure, maxAge, path: '/' })`.
- Responde `{ ok: true, user }` sin devolver el token al browser.

### `POST /api/auth/logout`

- `cookies().delete('box_session')`.
- Responde `{ ok: true }`.

---

## 5. Notas de contrato

- El frontend no interpreta el JWT: solo lo transporta.
- El rol del token es informativo; si el backend cambia el rol en base, `GET /users/me` refleja el valor real.
- No se expone `access_token` en props de Client Components ni en logs.
- El prefijo `/api/v1` lo agrega `src/api/client.ts`; las features no lo repiten.
