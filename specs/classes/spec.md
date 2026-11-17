# Feature: Explorar y reservar clases

**Feature ID:** F6
**Carpeta de implementación:** `app/(app)/classes/`, `src/components/features/classes/`
**Requisitos:** RF-FE-08, RF-FE-09
**Depende de:** F1, F2, F4 (vigencia de membresía y chip del header), F5 (estado de reservas)
**Endpoint principal:** `GET /wods`, `GET /wods/:id`, `POST /bookings`

---

## 1. Alcance

| Texto / dato del diseño | Implementación |
|-------------------------|----------------|
| `Atleta · Explorar y reservar clases` | Encabezado del shell + título de sección |
| `Hola, Lucía. Elegí tu próximo turno.` | Saludo de esta pantalla (no de un dashboard separado) |
| `Octubre 2026` | Mes del selector de días |
| `26`, `28`, `29`, `Hoy, 27`, `31`, `01` | Días disponibles en la franja semanal |
| `Fuerza + metcon`, `WOD` | Título y etiqueta de la tarjeta de clase |
| `Hoy, 19:00` | Franja seleccionada por defecto |
| `12:30`, `17:00`, `18:00`, `19:00`, `20:00` | Horarios visibles en el selector |
| `Libre` | Estado de cupo cuando `available_slots > 0` |
| `Libre mensual` | Chip de membresía del atleta, inyectado desde F4 |

**No incluye:** recurrencia de turnos, plantillas de WOD, lista de ejercicios, check-in, notificaciones, pago en el flujo.

---

## 2. Actores

| Actor | Puede |
|-------|-------|
| ATHLETE / COACH / ADMIN con membresía vigente | Reservar y cancelar sus reservas |
| Cualquier autenticado | Explorar agenda y detalle de turno |

> La regla de membresía aplica también a ADMIN y COACH en el backend; la UI no la relaja. La gestión de turnos vive en F7.

---

## 3. Reglas de UX

| ID | Regla |
|----|-------|
| RN-FE-CLS-01 | El selector de día usa `America/Asuncion`. El rango por defecto cubre la semana visible del diseño (`Hoy, 27` → `01`) y el máximo es 31 días (regla del backend). |
| RN-FE-CLS-02 | `Hoy, 19:00` se calcula con la zona del box; `start_time` llega en UTC con `Z`. |
| RN-FE-CLS-03 | Los horarios de la captura son `12:30`, `17:00`, `18:00`, `19:00` y `20:00`; se renderizan como franjas de la agenda, no como una lista libre. |
| RN-FE-CLS-04 | Cada tarjeta muestra etiqueta `WOD`, título, coach, hora, duración, `available_slots` y badge `Libre` / `Sin cupo` / `Lista de espera`. |
| RN-FE-CLS-05 | `available_slots` se calcula en el backend desde PostgreSQL; la UI no lo estima. |
| RN-FE-CLS-06 | El botón «Reservar» se deshabilita si: turno iniciado, sin membresía vigente, reserva ya activa o request en curso. |
| RN-FE-CLS-07 | Si `available_slots === 0`, el botón dice «Entrar en lista de espera» y la respuesta esperada es `200 WAITLIST`. |
| RN-FE-CLS-08 | Si no hay membresía, se muestra aviso con `MEMBERSHIP_REQUIRED` y CTA a `/memberships`; no se deshabilita sin explicación. |
| RN-FE-CLS-09 | `POST /bookings` envía `Idempotency-Key` generado al abrir la tarjeta y reutilizado en reintentos. |
| RN-FE-CLS-10 | `201 CONFIRMED` → toast «Reserva confirmada» y navegación opcional a `/bookings`. |
| RN-FE-CLS-11 | `200 WAITLIST` → toast con la posición devuelta por `message`/`data.waitlist_position`. |
| RN-FE-CLS-12 | Tras reservar se refresca la agenda para actualizar cupos. |
| RN-FE-CLS-13 | Errores por `code`: `WOD_ALREADY_STARTED`, `BOOKING_ALREADY_EXISTS`, `MEMBERSHIP_REQUIRED`, `RATE_LIMITED`. |
| RN-FE-CLS-14 | El selector de horarios es Client Component; la lista base de WODs se fetchea en el Server Component y se pasa como props serializables. |
| RN-FE-CLS-15 | Skeleton de 4 tarjetas durante carga; empty state «No hay turnos en este rango». |
| RN-FE-CLS-16 | El chip `Libre mensual` se oculta si F4 no devuelve membresía activa; su ausencia no bloquea la agenda. |

---

## 4. Modelo de vista

```ts
type ClassView = {
  wod_id: string
  title: string
  description: string | null
  coach_full_name: string | null
  start_time: string
  end_time: string
  max_capacity: number
  confirmed_count: number
  available_slots: number
  waitlist_count: number
}
```

Derivados:

| Valor | Regla |
|-------|-------|
| `slotBadge` | `available_slots > 0 ? 'Libre' : 'Lista de espera'` |
| `durationMinutes` | Diferencia `end_time - start_time` en minutos |
| `isStarted` | `start_time <= now` |
| `timeLabel` | `Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', hour: '2-digit', minute: '2-digit' })` → `19:00` |
| `dayLabel` | `Hoy` / `Mañana` / `lun 28` según fecha del box |

---

## 5. Flujo de reserva

```
1. Usuario abre /classes?from=<hoy>
2. Server Component consulta GET /wods?from&to
3. Usuario elige día (Client Component) y ve tarjetas en las franjas del diseño
4. Usuario toca "Reservar" / "Entrar en lista de espera"
5. useBookAction():
   5.1 valida membresía vigente (viene de F4 en props)
   5.2 POST /bookings con Idempotency-Key
   5.3 maneja 201/200/409/403
6. router.refresh() + toast
```

---

## 6. Criterios de aceptación

```gherkin
Escenario: Explorar agenda
  Dado un atleta autenticado
  Cuando abre /classes
  Entonces ve "Atleta · Explorar y reservar clases"
  Y ve "Hola, Lucía. Elegí tu próximo turno."
  Y ve "Octubre 2026" y el día "Hoy, 27"
  Y ve los horarios 12:30, 17:00, 18:00, 19:00 y 20:00
  Y la tarjeta "Fuerza + metcon" con badge "Libre"

Escenario: Reserva con cupo
  Dado un turno "Fuerza + metcon" con 5 cupos
  Cuando el atleta toca "Reservar"
  Entonces recibe 201 y ve "Reserva confirmada"
  Y el cupo disponible baja en 1 al refrescar

Escenario: Turno lleno
  Dado un turno con available_slots = 0
  Cuando el atleta toca "Entrar en lista de espera"
  Entonces recibe 200 y ve su posición en la espera

Escenario: Sin membresía
  Dado un atleta sin membresía vigente
  Cuando intenta reservar
  Entonces ve MEMBERSHIP_REQUIRED con CTA a /memberships
  Y no se envía la petición POST
```

---

## 7. Fuera de alcance

- Calendario mensual completo (solo franja semanal en v1).
- Filtros por coach, modalidad o nivel.
- Mapa de areas/capacidad por zona.
- Reservas recurrentes.
- Crear/editar turnos: pertenece a F7.
