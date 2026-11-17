# Feature: Mis reservas

**Feature ID:** F5
**Carpeta de implementación:** `app/(app)/bookings/`, `src/components/features/bookings/`
**Requisitos:** RF-FE-06, RF-FE-07
**Depende de:** F1, F2
**Endpoint principal:** `GET /bookings/me`, `DELETE /bookings/:id`

---

## 1. Alcance

| Texto de la captura | Implementación |
|---------------------|----------------|
| `Atleta · Mis reservas` | Encabezado del shell + título de sección |
| `Tu entrenamiento, organizado.` | Subtítulo / estado vacío |
| `Reservas confirmadas` | Agrupador de reservas `CONFIRMED` |
| `Lista de espera` | Agrupador de reservas `WAITLIST` con posición |
| `WOD · Fuerza metcon` | Título de cada ítem (según diseño) |
| `27`, `28` | Días de ejemplo de los turnos |
| `¿Cancelar tu reserva?` | Diálogo de confirmación antes de cancelar |
| `Libre mensual` | Chip de membresía inyectado desde F4 |

**No incluye:** check-in/NOSHOW, reprogramación, reservas a nombre de otro, cancelación masiva, notificaciones push/email.

---

## 2. Actores

| Actor | Puede |
|-------|-------|
| ATHLETE / COACH / ADMIN | Ver y cancelar **sus propias** reservas |

---

## 3. Reglas de UX

| ID | Regla |
|----|-------|
| RN-FE-BKG-01 | La lista muestra reservas `CONFIRMED` y `WAITLIST` ordenadas por `start_time ASC`; las canceladas se ocultan por defecto. |
| RN-FE-BKG-02 | Cada ítem muestra título del WOD, coach, fecha/hora en `America/Asuncion`, estado y cupo/posición. |
| RN-FE-BKG-03 | `WAITLIST` muestra `Lista de espera #<waitlist_position>`; no solo un color. |
| RN-FE-BKG-04 | El botón «Cancelar reserva» abre un diálogo con el texto exacto `¿Cancelar tu reserva?`, el nombre del turno y acciones «Volver» / «Cancelar reserva». |
| RN-FE-BKG-05 | La cancelación envía `DELETE /bookings/:id`; el botón permanece deshabilitado hasta respuesta. |
| RN-FE-BKG-06 | Si la respuesta indica `promoted: true`, se muestra un aviso `role="status"`: «Se promovió a la siguiente persona de la lista de espera». |
| RN-FE-BKG-07 | Tras cancelar se refresca la lista (`router.refresh()` o revalidación) y el ítem desaparece. |
| RN-FE-BKG-08 | Errores por `code`: `BOOKING_ALREADY_CANCELLED` → recargar lista; `BOOKING_CANCELLATION_CLOSED` → aviso con el cutoff; `BOOKING_NOT_OWNER` → error genérico sin exponer datos ajenos. |
| RN-FE-BKG-09 | Estado vacío con el copy del diseño y CTA «Explorar clases». |
| RN-FE-BKG-10 | El diálogo es accesible: `role="dialog"`, `aria-modal`, foco inicial en «Volver», cierre con `Escape`. |
| RN-FE-BKG-11 | En móvil, cada reserva es una tarjeta apilada; en desktop, filas con acciones a la derecha. |
| RN-FE-BKG-12 | La hora se calcula desde `start_time` UTC con zona del box; se muestra `Hoy, 19:00` cuando corresponde. |
| RN-FE-BKG-13 | La lista se agrupa por estado con los rótulos del diseño: «Reservas confirmadas» y «Lista de espera». |
| RN-FE-BKG-14 | El chip «Libre mensual» se inyecta desde F4; si no hay membresía activa se oculta sin afectar la lista. |

---

## 4. Modelo de vista

```ts
type BookingView = {
  booking_id: string
  wod_id: string
  title: string
  coach_full_name: string | null
  start_time: string       // ISO UTC
  end_time: string         // ISO UTC
  status: 'CONFIRMED' | 'WAITLIST' | 'CANCELLED' | 'NOSHOW'
  waitlist_position: number | null
  available_slots: number
}
```

Derivados:

| Valor | Regla |
|-------|-------|
| `statusLabel` | `CONFIRMED → 'Confirmada'`, `WAITLIST → 'Lista de espera #n'` |
| `canCancel` | `status === 'CONFIRMED' || status === 'WAITLIST'` y `start_time > now` |
| `slotLabel` | `available_slots > 0 ? 'Libre' : 'Sin cupo'` (para el detalle del WOD) |

---

## 5. Flujo de cancelación

```
1. Usuario toca "Cancelar reserva"
2. Diálogo: "¿Cancelar tu reserva?" + turno + acciones
3. Confirma -> DELETE /bookings/:id
4. Éxito -> aviso (promoted?) -> router.refresh()
5. Error -> mensaje por code -> diálogo sigue abierto o se cierra según el caso
```

---

## 6. Criterios de aceptación

```gherkin
Escenario: Lista con reserva confirmada
  Dado un atleta con una reserva CONFIRMED
  Cuando abre /bookings
  Entonces ve "Atleta · Mis reservas" y "Tu entrenamiento, organizado."
  Y ve el agrupador "Reservas confirmadas"
  Y ve el título del turno, la hora y el badge "Confirmada"

Escenario: Lista de espera
  Dado un atleta con una reserva WAITLIST en posición 3
  Cuando abre /bookings
  Entonces ve "Lista de espera #3"

Escenario: Cancelar con promoción
  Dado un turno lleno con espera
  Cuando el atleta confirma "¿Cancelar tu reserva?"
  Entonces la reserva desaparece de la lista
  Y ve el aviso de promoción

Escenario: Sin reservas
  Dado un atleta sin reservas activas
  Cuando abre /bookings
  Entonces ve el estado vacío con CTA a /classes

Escenario: Cancelación cerrada
  Dado un turno dentro del cutoff de cancelación
  Cuando intenta cancelar
  Entonces ve el error BOOKING_CANCELLATION_CLOSED
  Y la reserva sigue en la lista
```

---

## 7. Fuera de alcance

- Confirmación de asistencia.
- Cambio de turno.
- Cancelación de reservas ajenas.
- Historial de reservas canceladas (se podrá agregar como filtro futuro).
