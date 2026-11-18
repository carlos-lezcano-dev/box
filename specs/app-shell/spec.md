# Feature: Shell de aplicación

**Feature ID:** F2
**Carpeta de implementación:** `app/(app)/layout.tsx`, `src/components/layout/`
**Requisitos:** RF-FE-03
**Depende de:** F1 (sesión y `GET /users/me`)
**Habilita:** F3–F7

---

## 1. Alcance

| Elemento del diseño | Implementación |
|---------------------|----------------|
| Marca **BOX** | Logo/texto fijo en sidebar y header móvil (presente en las 7 capturas) |
| Chip de rol + título | Encabezado compuesto: `Atleta · Explorar y reservar clases`, `Atleta · Mis reservas` |
| Navegación lateral | Secciones del box según entorno: atleta (Explorar clases, Mis reservas) / admin (Panel general, Agenda turnos, Usuarios, Membresías y pagos, Administración) |
| Menú de usuario | Perfil (solo visual en v1) y «Cerrar sesión» |
| Chip «Libre mensual» | Dato de membresía del atleta, inyectado por F4 en las cabeceras de F5/F6 |

**No incluye:** cambio de tema, selector de idioma, notificaciones, búsqueda global, subida de avatar.

---

## 2. Actores

| Actor | Navegación visible |
|-------|--------------------|
| `ATHLETE` | Explorar clases, Mis reservas |
| `COACH` | Ídem (sin enlaces ADMIN en v1; alcance a confirmar) |
| `ADMIN` | Explorar clases, Mis reservas + Panel general, Agenda turnos, Usuarios, Membresías y pagos, Administración |

El backend es la autoridad: filtrar enlaces es UX; los guards de rol viven en los layouts y en cada endpoint.

---

## 3. Reglas de UX

| ID | Regla |
|----|-------|
| RN-FE-SHELL-01 | El layout es Server Component y obtiene el usuario con `requireUser()`; los hijos no vuelven a pedir `/users/me`. |
| RN-FE-SHELL-02 | La navegación activa se detecta con `usePathname()` en un Client Component pequeño (`NavLinks`), no en todo el layout. |
| RN-FE-SHELL-03 | El enlace activo lleva `aria-current="page"` y un estilo visual inequívoco. |
| RN-FE-SHELL-04 | En desktop (≥ 1024 px) el sidebar es fijo; en móvil se colapsa y se abre con botón `aria-expanded`/`aria-controls`. |
| RN-FE-SHELL-05 | El nombre mostrado es `full_name.split(' ')[0]` con fallback a `email.split('@')[0]`; «Lucía» es el dato del diseño. |
| RN-FE-SHELL-06 | El chip de rol muestra `ATHLETE → 'Atleta'`, `COACH → 'Entrenador'`, `ADMIN → 'Administrador'` (coherente con RN-FE-ADM-27). |
| RN-FE-SHELL-07 | «Cerrar sesión» llama a `POST /api/auth/logout` y redirige a `/login`. |
| RN-FE-SHELL-08 | El encabezado compone `rol · título de sección`; el título lo aporta cada feature, el shell solo compone. |
| RN-FE-SHELL-09 | Si `requireUser()` falla, el layout redirige a `/login`; nunca renderiza un header con datos vacíos. |
| RN-FE-SHELL-10 | El main tiene `id="main-content"` y existe un skip link al inicio. |
| RN-FE-SHELL-11 | El shell no decide el contenido de `/`: la página `app/(app)/page.tsx` (F3) muestra el panel para ADMIN y redirige a los demás roles. |
| RN-FE-SHELL-12 | El chip «Libre mensual» se pasa como prop serializable desde F4; si no hay membresía, se oculta sin romper el header. |
| RN-FE-SHELL-13 | Los destinos del menú son canónicos: Panel general → `/` (F3), Agenda turnos → `/admin/schedule`, Usuarios → `/admin/users`, Membresías y pagos → `/admin/memberships`, Administración → `/admin` (F7). El shell no crea rutas propias. |

---

## 4. Estructura visual

```
┌───────────────┬──────────────────────────────────────────────┐
│               │  Atleta · Explorar y reservar clases         │
│   BOX         │  Hola, Lucía. Elegí tu próximo turno.         │
│               ├──────────────────────────────────────────────┤
│  Explorar     │                                              │
│  Mis reservas │              {children}                       │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

Vista ADMIN (mismo sidebar, otro conjunto de enlaces):

```
Panel general · Agenda turnos · Usuarios · Membresías y pagos · Administración
```

---

## 5. Criterios de aceptación

```gherkin
Escenario: Shell de atleta autenticado
  Dado un usuario ATHLETE llamado Lucía
  Cuando carga /classes
  Entonces ve la marca BOX
  Y el encabezado "Atleta · Explorar y reservar clases"
  Y los enlaces "Explorar clases" y "Mis reservas"

Escenario: Shell de administrador
  Dado un usuario ADMIN
  Cuando carga /admin
  Entonces ve los enlaces "Panel general", "Agenda turnos", "Usuarios", "Membresías y pagos" y "Administración"

Escenario: Navegación activa
  Dado el usuario en /bookings
  Cuando renderiza el menú
  Entonces "Mis reservas" tiene aria-current="page"

Escenario: Menú móvil
  Dado una viewport de 390 px
  Cuando toca el botón de menú
  Entonces el sidebar se despliega y aria-expanded pasa a true

Escenario: Cerrar sesión
  Dado un usuario autenticado
  Cuando confirma "Cerrar sesión"
  Entonces se elimina la cookie y es redirigido a /login
```

---

## 6. Fuera de alcance

- Personalización del menú por preferencias del usuario.
- Notificaciones, tema oscuro/claro e i18n.
- Edición de perfil (placeholder no funcional o invisible en v1).
- Definir el subconjunto exacto de enlaces de COACH: queda pendiente de confirmación.
