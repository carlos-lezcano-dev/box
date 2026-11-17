# Plan de implementación — Panel general

**Feature ID:** F3
**Estado:** pendiente
**Estimación:** 0,5 día
**Precondición:** F1, F2 y Fase 0 (cliente API, formateo, guard de rol)

---

## 1. Archivos a crear

```
app/(app)/page.tsx
src/api/dashboard.ts
src/components/features/dashboard/panel-header.tsx
src/components/features/dashboard/metric-card.tsx
src/components/features/dashboard/next-wods-card.tsx
src/lib/dashboard-view.ts
src/lib/dashboard-view.spec.ts
tests/e2e/panel-general.spec.ts
```

> `loading.tsx` y `error.tsx` del grupo `(app)` los crea F2 y se heredan aquí; F3 no los duplica. Tampoco crea un grupo `(admin)`: ese segmento lo usa F7 en `app/(app)/admin/`.

---

## 2. Tareas

### 2.1 Datos

- [ ] `src/api/dashboard.ts`: `getPanelMetrics()` con `Promise.allSettled` para `/users`, `/memberships` y `/wods`.
- [ ] Leer `meta.total`, nunca `data.length`, para los contadores.
- [ ] `src/lib/dashboard-view.ts`: `toPanelGeneralView()` con `null` para métricas sin fuente.
- [ ] No crear tarjetas para `86`, `72%`, `76%` ni `10:12` hasta confirmar su significado.

### 2.2 UI y guard

- [ ] `app/(app)/page.tsx`: `const user = await requireUser()`; si `role !== 'ADMIN'`, `redirect('/classes?from=<hoy>')`.
- [ ] `PanelHeader` con «Panel general administrativo», «BOX» y «Todo listo para un día más fuerte.».
- [ ] `MetricCard` con `tabular-nums`, soporte de `null` (ocultar) y estado de error local.
- [ ] `NextWodsCard` con hora en `America/Asuncion` y hasta 5 turnos ordenados.
- [ ] `401` redirige a `/login?next=/`; `403` muestra «Acceso restringido».
- [ ] El enlace «Panel general» del menú F2 apunta a `/` y no genera un dashboard duplicado.

### 2.3 Estados y responsive

- [ ] Usar el `Suspense`/boundary heredado de F2; además, cada métrica con su propio boundary local.
- [ ] Grid de 4 columnas en desktop, 2 en tablet y apilado en móvil.
- [ ] Contraste AA verificado en texto sobre superficies oscuras.

---

## 3. Pruebas

- [ ] `toPanelGeneralView()` usa `meta.total` con `limit=1`.
- [ ] Métricas sin fuente devuelven `null` y no generan tarjeta.
- [ ] Formato de `$6.240.000` con `es-PY`/PYG.
- [ ] Horarios convertidos a `America/Asuncion` (`18:00Z` → `15:00` local, según caso).
- [ ] E2E: ADMIN ve «Panel general administrativo» y los contadores en `/`.
- [ ] E2E: ATHLETE y COACH en `/` caen en `/classes`.
- [ ] E2E: fallo de `/memberships` no rompe el resto del panel.

---

## 4. Definition of Done

- [ ] Copy exacto del diseño en encabezado y subtítulo.
- [ ] Contadores derivados de `meta.total`.
- [ ] Métricas no confirmadas ausentes del DOM.
- [ ] Guard de rol en servidor + redirect para atletas y coaches.
- [ ] Cuatro estados por tarjeta (loading/empty/error/success).
- [ ] Sin grupo `(admin)` ni ruta `/admin` duplicada con F7.
- [ ] `npm run lint` y `npm run build` en verde.

---

## 5. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `$6.240.000` no es una suma computable con la API paginada | Marcar como hipótesis; no cablear hasta confirmar |
| `GET /wods` no trae `coach_full_name` | Ocultar el nombre o resolver con `/users/:id` solo para ADMIN |
| Métricas sin endpoint se inventen por presión del diseño | Regla RN-FE-DASH-04: omitir del DOM, nunca estimar |
| F2 y F3 resuelvan `/` con contenidos distintos | Una sola página `app/(app)/page.tsx` con ramificación por rol |
