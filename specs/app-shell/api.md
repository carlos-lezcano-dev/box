# API — Shell de aplicación

**Contratos relacionados:** [`auth/api.md`](../auth/api.md), [`box-core/specs/users/api.md`](../../../box-core/specs/users/api.md)

---

## 1. Endpoints consumidos

| Endpoint | Momento | Uso |
|----------|---------|-----|
| `GET /users/me` | Una vez por carga del layout `(app)` | Nombre, email y rol del header/sidebar |
| `POST /api/auth/logout` | Acción «Cerrar sesión» | Eliminar cookie local |

---

## 2. Datos que necesita el layout

```ts
type ShellUser = {
  user_id: string
  full_name: string
  email: string
  role: 'ATHLETE' | 'COACH' | 'ADMIN'
}
```

Derived fields (no vienen en la API):

| Valor | Regla |
|-------|-------|
| `displayName` | `full_name.trim().split(' ')[0]` o, si está vacío, `email.split('@')[0]`. |
| `roleLabel` | `ATHLETE → 'Atleta'`, `COACH → 'Coach'`, `ADMIN → 'Admin'`. |
| `headerTitle` | Lo aporta la ruta (F5/F6/F7); el shell compone `${roleLabel} · ${headerTitle}`. |

> El tipo `ShellUser` es un subconjunto de `GET /users/me`. El shell no pide `GET /users` (solo ADMIN): eso rompería el inicio de un atleta.

---

## 3. Navegación

Tabla canónica compartida con F3 y F7. `src/lib/nav.ts` es la única fuente de estos destinos.

| Ruta | Etiqueta | Roles | Origen / responsable |
|------|----------|-------|----------------------|
| `/` | Panel general | ADMIN | F3 — para otros roles redirige a `/classes` |
| `/classes` | Explorar clases | Todos | F6 — captura «Atleta · Explorar y reservar clases» |
| `/bookings` | Mis reservas | Todos | F5 — captura «Atleta · Mis reservas» |
| `/admin` | Administración (hub) | ADMIN | F7 — índice de gestión |
| `/admin/schedule` | Agenda turnos | ADMIN* | F7 — captura «Agenda de turnos» |
| `/admin/users` | Usuarios | ADMIN | F7 — captura «Gestión de usuarios» |
| `/admin/memberships` | Membresías y pagos | ADMIN | F7 — captura «Membresías y pagos mensuales» |

\* El alcance exacto de COACH en el menú administrativo queda pendiente de confirmación; en v1 no se muestran estos enlaces. El backend es la autoridad.

> No existe una ruta `/admin/wods`: la agenda es `/admin/schedule`. El panel general **no** es `/admin`: es `/`. `/admin` es el hub «Administración» de F7.

Las etiquetas de atleta son las que muestra el diseño. El orden del sidebar proviene de las capturas admin: Panel general, Agenda turnos, Usuarios, Membresías y pagos, Administración.

---

## 4. Notas

- El menú se construye en servidor a partir del rol; `NavLinks` solo recibe la lista ya filtrada y el `pathname`.
- Todas las rutas viven bajo el grupo `(app)`; el segmento `/admin/**` agrega su propio `layout.tsx` de rol en F7. No hay grupo `(admin)` paralelo.
- No se almacena el perfil en `localStorage`; se rehidrata por request con `cache: 'no-store'`.
- `401` → limpiar sesión y redirect `/login?next=<ruta>`. `403` en rutas `/admin/**` → pantalla «Acceso restringido» (F7), no redirect a `/classes`.
- El chip «Libre mensual» se resuelve en F4 y se inyecta como prop; el shell no consulta `/memberships/me` por su cuenta.
