# Feature: Panel general

**Feature ID:** F3
**Carpeta de implementación:** `app/(app)/page.tsx`, `src/components/features/dashboard/`
**Requisitos:** RF-FE-04
**Depende de:** F1, F2
**Ruta:** `/` (solo ADMIN). Para `ATHLETE`/`COACH`, `/` redirige a `/classes?from=<hoy>`.

> El hub «Administración» en `/admin` y sus subvistas pertenecen a F7. El enlace del menú «Panel general» apunta a `/` y lo resuelve esta feature; F7 no duplica este panel.

---

## 1. Alcance

El diseño muestra un **panel general administrativo**, no un dashboard de atleta. El saludo «Hola, Lucía…» pertenece a la pantalla de explorar clases (F6).

| Texto / dato del diseño | Implementación |
|-------------------------|----------------|
| `Panel general administrativo` | Título de la página |
| `BOX` | Nombre del box en el encabezado |
| `Todo listo para un día más fuerte.` | Subtítulo fijo |
| `148` | Total de atletas (`GET /users?role=ATHLETE&limit=1` → `meta.total`) |
| `18 membresías` | Total de membresías (`GET /memberships?limit=1` → `meta.total`) |
| `$6.240.000` | Importe agregado/recaudación (hipótesis pendiente de confirmar) |
| `86`, `72%`, `76%`, `10:12` | Métricas sin fuente confirmada: **no se cablean** hasta validar su significado |
| `10:00`, `12:30`, `18:00` | Próximos turnos del día (`GET /wods`) |

**No incluye:** gráficos, exportaciones, filtros de rango, métricas globales de reservas (el backend no expone un endpoint agregado), panel para atletas ni las subvistas de F7.

---

## 2. Actores

| Actor | Acceso |
|-------|--------|
| `ADMIN` | Panel general completo |
| `COACH` | `/` redirige a `/classes` (los endpoints `/users` y `/memberships` son exclusivos de ADMIN) |
| `ATHLETE` | `/` redirige a `/classes` |

La autoridad la tiene el backend: los guards de rol viven en el cliente HTTP y en los `RolesGuard` de `box-core`. El chequeo de rol en la página es solo UX. El alcance de COACH en el menú administrativo queda pendiente de confirmación; en v1 no ve esos enlaces.

---

## 3. Reglas de UX

| ID | Regla |
|----|-------|
| RN-FE-DASH-01 | `app/(app)/page.tsx` verifica `requireUser()`: si `role !== 'ADMIN'`, `redirect('/classes?from=<hoy>')`. |
| RN-FE-DASH-02 | El panel solo se monta para `ADMIN`. Un `401` redirige a `/login`; un `403` del backend se trata como acceso restringido, no como un shuffle silencioso. |
| RN-FE-DASH-03 | Los contadores `148` y `18 membresías` se derivan de `meta.total`, nunca de `data.length` paginado. |
| RN-FE-DASH-04 | Las métricas sin fuente (`86`, `72%`, `76%`, `10:12`) se omiten del DOM; no se muestra `—` ni un número inventado. |
| RN-FE-DASH-05 | `$6.240.000` se formatea con `Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 })`. |
| RN-FE-DASH-06 | Los próximos turnos se obtienen con `GET /wods?from&to` en `America/Asuncion` y se ordenan por `start_time ASC`. |
| RN-FE-DASH-07 | Cada tarjeta tiene su propio `Suspense`: si falla una métrica, el resto del panel sigue visible. |
| RN-FE-DASH-08 | Los números usan `font-variant-numeric: tabular-nums` para evitar saltos de ancho. |
| RN-FE-DASH-09 | El `loading.tsx` y `error.tsx` del grupo `(app)` los aporta F2; F3 no los duplica. |
| RN-FE-DASH-10 | Los textos del diseño son fijos; no dependen de datos salvo los contadores. |

---

## 4. Modelo de vista

```ts
type PanelGeneralView = {
  totalAthletes: number | null
  totalMemberships: number | null
  collectedAmount: number | null
  nextWods: Array<{
    wod_id: string
    title: string
    start_time: string
    coach_full_name: string | null
    available_slots: number
  }>
}
```

| Valor | Regla |
|-------|-------|
| `totalAthletes` | `meta.total` de `GET /users?role=ATHLETE&limit=1` |
| `totalMemberships` | `meta.total` de `GET /memberships?limit=1` |
| `collectedAmount` | Suma de `amount_paid` del rango; si el endpoint no lo expone, queda `null` y se oculta |
| `nextWods` | Primeros 3–5 turnos de `GET /wods` en el rango de hoy |

---

## 5. Criterios de aceptación

```gherkin
Escenario: Panel general de ADMIN
  Dado un ADMIN autenticado
  Cuando abre /
  Entonces ve "Panel general administrativo" y "BOX"
  Y ve "Todo listo para un día más fuerte."
  Y ve el total de atletas y el total de membresías desde meta.total

Escenario: Rol sin acceso al panel
  Dado un ATHLETE o COACH autenticado
  Cuando abre /
  Entonces es redirigido a /classes?from=<hoy>

Escenario: Métrica sin fuente
  Dado que el significado de 86 no está confirmado
  Cuando carga el panel
  Entonces no se renderiza ningún componente para esa métrica

Escenario: Fallo parcial
  Dado que GET /memberships responde 500
  Cuando carga el panel
  Entonces solo la tarjeta de membresías muestra error
  Y el resto de las tarjetas se renderizan normalmente
```

---

## 6. Fuera de alcance

- Dashboard diferenciado para atleta (su inicio es F6).
- Subvistas `/admin/**` (pertenecen a F7).
- Gráficos, exportaciones y filtros de rango.
- Métricas agregadas de reservas (requieren un endpoint que hoy no existe).
- Definir el significado de `86`, `72%`, `76%` y `10:12`: queda en `shared/design-reference.md` como pendiente.
