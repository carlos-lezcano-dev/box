# Plan de implementación — Shell de aplicación

**Feature ID:** F2
**Estado:** pendiente
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

---

## 2. Tareas

### 2.1 Layout

- [ ] `app/(app)/layout.tsx` como Server Component: `const user = await requireUser()`.
- [ ] Pasar `ShellUser`, `navItems` filtrados y `headerTitle` a `Sidebar` y `Header`.
- [ ] Agregar `<SkipLink />` y `<main id="main-content">{children}</main>`.
- [ ] No resolver `/` en el shell: `app/(app)/page.tsx` (F3) muestra el panel para ADMIN y redirige a los demás roles.
- [ ] Crear `loading.tsx` con skeletons de sidebar + header + contenido.
- [ ] Crear `error.tsx` con «No pudimos cargar tu espacio» y botón «Reintentar» (`reset()`).

### 2.2 Sidebar y navegación

- [ ] `src/lib/nav.ts`: define `NAV_ITEMS` con `{ href, label, roles, section }` y `getNavItems(role)`.
- [ ] Destinos canónicos: Panel general `/`, Explorar clases `/classes`, Mis reservas `/bookings`, Administración `/admin`, Agenda turnos `/admin/schedule`, Usuarios `/admin/users`, Membresías y pagos `/admin/memberships`.
- [ ] `Sidebar` renderiza la marca **BOX** y los ítems devueltos.
- [ ] Sección atleta: Explorar clases, Mis reservas.
- [ ] Sección admin (solo ADMIN en v1): Panel general, Agenda turnos, Usuarios, Membresías y pagos, Administración.
- [ ] `NavLinks` como Client Component: `usePathname()` y `aria-current`.
- [ ] En móvil, `MobileNavToggle` controla `aria-expanded`/`aria-controls` y cierra al navegar.

### 2.3 Header y usuario

- [ ] `Header` compone `${roleLabel} · ${headerTitle}` y recibe props serializables.
- [ ] `RoleChip` con `ATHLETE → 'Atleta'`, `COACH → 'Coach'`, `ADMIN → 'Admin'`.
- [ ] `src/lib/display.ts`: `getDisplayName()` y `getRoleLabel()` con pruebas.
- [ ] `UserMenu` como Client Component: botón con nombre/rol y menú desplegable accesible.
- [ ] Acción «Cerrar sesión» → `POST /api/auth/logout` → `router.replace('/login')` + `router.refresh()`.
- [ ] Cerrar el menú con `Escape` y al hacer clic fuera.
- [ ] Chip «Libre mensual» inyectado desde F4, oculto si no hay membresía.

### 2.4 Tokens y responsive

- [ ] Ajustar `app/globals.css` con los tokens de `specs/shared/conventions.md` (valores a confirmar con diseño).
- [ ] Sidebar fijo `lg:` y drawer `max-lg:`.
- [ ] Evitar `position: fixed` sin compensar el padding del `main`.
- [ ] Verificar contraste AA del chip de rol.

---

## 3. Pruebas

- [ ] `getDisplayName('Lucía Martínez') === 'Lucía'`.
- [ ] `getDisplayName('', 'lucia@example.com') === 'lucia'`.
- [ ] `getRoleLabel` para los tres roles.
- [ ] `getNavItems('ATHLETE')` devuelve solo Explorar clases y Mis reservas.
- [ ] `getNavItems('ADMIN')` incluye los cinco enlaces admin.
- [ ] `Sidebar` marca `aria-current` en la ruta activa.
- [ ] E2E: login ATHLETE → encabezado «Atleta · Explorar y reservar clases».
- [ ] E2E: login ADMIN → menú con los cinco enlaces admin.
- [ ] E2E: viewport móvil abre/cierra el drawer.
- [ ] E2E: logout elimina cookie y vuelve a `/login`.

---

## 4. Definition of Done

- [ ] Una sola llamada a `/users/me` por carga del shell.
- [ ] Marca BOX visible en todas las rutas privadas.
- [ ] Encabezado `rol · título` idéntico al diseño en F5/F6.
- [ ] Rol mostrado en español.
- [ ] Navegación accesible con teclado.
- [ ] Responsive 390 px / 768 px / 1440 px verificado.
- [ ] `loading.tsx` y `error.tsx` funcionando.
- [ ] `npm run lint` y `npm run build` en verde.

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| El título de sección se duplica entre shell y feature | El shell solo compone; la ruta aporta `headerTitle` |
| Etiquetas admin inferidas del OCR | Validadas contra `shared/design-reference.md`; marcar como pendientes las dudosas |
| Alcance de COACH no confirmado | `getNavItems('COACH')` aislado en `src/lib/nav.ts` para ajustar en un solo lugar |
| Menú desplegable sin foco atrapado | Patrón `role="menu"` con cierre por Escape y clic fuera; no es modal |
| Layout no se re-renderiza al cambiar rol | El rol se rehidrata con `router.refresh()` tras login/logout |
