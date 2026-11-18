# Plan de implementación — Shell de aplicación

**Feature ID:** F2
**Estado:** completo
**Estimación:** 1 día
**Precondición:** F1 completado

---

## 1. Archivos a crear

```
app/(app)/layout.tsx
app/(app)/loading.tsx
app/(app)/error.tsx
src/components/layout/sidebar.tsx
src/components/layout/nav-links.tsx
src/components/layout/header.tsx
src/components/layout/role-chip.tsx
src/components/layout/user-menu.tsx
src/components/layout/mobile-nav-toggle.tsx
src/components/layout/skip-link.tsx
src/lib/display.ts
src/lib/nav.ts
src/components/layout/sidebar.spec.tsx
src/lib/display.spec.ts
tests/e2e/shell.spec.ts
```

> `role-chip`, `mobile-nav-toggle` y `skip-link` se resolvieron dentro de `Header`, `Sidebar` y `layout.tsx`; no hace falta un archivo separado por etiqueta.

---

## 2. Tareas

### 2.1 Layout

- [x] `app/(app)/layout.tsx` como Server Component: `const user = await requireUser()`.
- [x] Pasar `ShellUser`, `navItems` filtrados y `headerTitle` a `Sidebar` y `Header` — usuario e ítems se derivan en `AppChrome`; el título se resuelve por ruta con `getHeaderTitle()` (F5/F6/F7), sin decidir el contenido.
- [x] Agregar `<SkipLink />` y `<main id="main-content">{children}</main>`.
- [x] No resolver `/` en el shell: `app/(app)/page.tsx` (F3) muestra el panel para ADMIN y redirige a los demás roles (`getHeaderTitle('/')` sólo compone «Panel general»).
- [x] Crear `loading.tsx` con skeletons de sidebar + header + contenido.
- [x] Crear `error.tsx` con «No pudimos cargar tu espacio» y botón «Reintentar» (`retry()`).

### 2.2 Sidebar y navegación

- [x] `src/lib/nav.ts`: define `NAV_ITEMS` con `{ href, label, roles, section }` y `getNavItems(role)`.
- [x] Destinos canónicos: Panel general `/`, Explorar clases `/classes`, Mis reservas `/bookings`, Administración `/admin`, Agenda turnos `/admin/schedule`, Usuarios `/admin/users`, Membresías y pagos `/admin/memberships`.
- [x] `Sidebar` renderiza la marca **BOX** y los ítems devueltos.
- [x] Sección atleta: Explorar clases, Mis reservas.
- [x] Sección admin (solo ADMIN en v1): Panel general, Agenda turnos, Usuarios, Membresías y pagos, Administración.
- [x] `NavLinks` como Client Component: `usePathname()` y `aria-current`.
- [x] En móvil, el botón del header controla `aria-expanded`/`aria-controls` y el drawer cierra al navegar.

### 2.3 Header y usuario

- [x] `Header` compone `${roleLabel} · ${headerTitle}` y recibe props serializables.
- [x] Chip de rol con `ATHLETE → 'Atleta'`, `COACH → 'Entrenador'`, `ADMIN → 'Administrador'` (coherente con RN-FE-ADM-27).
- [x] `src/lib/display.ts`: `getDisplayName()` y `getRoleLabel()` con pruebas pendientes.
- [x] `UserMenu` como Client Component: botón con nombre/rol y menú desplegable accesible.
- [x] Acción «Cerrar sesión» → `POST /api/auth/logout` → `router.replace('/login')` + `router.refresh()`.
- [x] Cerrar el menú con `Escape` y al hacer clic fuera.
- [x] Chip «Libre mensual» inyectado desde F4, oculto si no hay membresía.

### 2.4 Tokens y responsive

- [x] Ajustar `app/globals.css` con los tokens de `specs/shared/conventions.md` (valores a confirmar con diseño).
- [x] Sidebar fijo `lg:` y drawer `max-lg:`.
- [x] Evitar `position: fixed` sin compensar el padding del `main`.
- [x] Verificar contraste AA del chip de rol (axe-core sobre el header del shell).

---

## 3. Pruebas

- [x] `getDisplayName('Lucía Martínez') === 'Lucía'`.
- [x] `getDisplayName('', 'lucia@example.com') === 'lucia'`.
- [x] `getRoleLabel` para los tres roles.
- [x] `getNavItems('ATHLETE')` devuelve solo Explorar clases y Mis reservas.
- [x] `getNavItems('ADMIN')` incluye los cinco enlaces admin.
- [x] `getHeaderTitle()` por ruta (incluye `/` y las rutas admin).
- [x] `Sidebar` marca `aria-current` en la ruta activa.
- [x] E2E: login ATHLETE → encabezado «Atleta · Explorar y reservar clases» y chip del plan vigente.
- [x] E2E: login ADMIN → menú con los cinco enlaces admin; «Panel general» lleva a `/` sin duplicar F3.
- [x] E2E: viewport móvil abre/cierra el drawer (`aria-expanded`/`aria-controls`).
- [x] E2E: logout elimina cookie y vuelve a `/login`.
- [x] E2E: 390 / 768 / 1440 px sin desbordamiento horizontal.
- [x] E2E: contraste AA del chip de rol con `@axe-core/playwright`.

---

## 4. Definition of Done

- [x] Una sola llamada a `/users/me` por carga del shell.
- [x] Marca BOX visible en todas las rutas privadas.
- [x] Encabezado `rol · título` idéntico al diseño en F5/F6.
- [x] Rol mostrado en español.
- [x] Navegación accesible con teclado.
- [x] Responsive 390 px / 768 px / 1440 px verificado.
- [x] `loading.tsx` y `error.tsx` funcionando.
- [x] `npm run lint` y `npm run build` en verde.

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| El título de sección se duplica entre shell y feature | El shell solo compone; la ruta aporta `headerTitle` |
| Etiquetas admin inferidas del OCR | Validadas contra `shared/design-reference.md`; marcar como pendientes las dudosas |
| Alcance de COACH no confirmado | `getNavItems('COACH')` aislado en `src/lib/nav.ts` para ajustar en un solo lugar |
| Menú desplegable sin foco atrapado | Patrón `role="menu"` con cierre por Escape y clic fuera; no es modal |
| Layout no se re-renderiza al cambiar rol | El rol se rehidrata con `router.refresh()` tras login/logout |
