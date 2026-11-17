# Referencia visual — capturas del diseño

**Ubicación:** [`Rererences/`](../Rererences/)
**Método de lectura:** OCR de Windows sobre los 7 PNG (texto + posición aproximada). El modelo no puede ver imágenes directamente; las erratas evidentes del OCR se corrigieron en los documentos de cada feature.

> **Nombre oficial:** la marca del producto es **BOX**. Cualquier texto de marca distinto en las capturas se trata como placeholder del diseño y se reemplaza por BOX en todas las specs.

> Los colores exactos y las etiquetas de algunas métricas **no** pudieron leerse de forma fiable. Donde no hay evidencia, la spec lo marca como pendiente de confirmación en lugar de inventarlo.

---

## 1. Inventario de pantallas

| Captura | Pantalla | Feature |
|---------|----------|---------|
| `Captura de pantalla 2026-11-17 153400.png` | Panel general administrativo — «BOX», «Todo listo para un día más fuerte.» | F3 |
| `Captura de pantalla 2026-11-17 153455.png` | Gestión de usuarios — «El motor del box.» | F7 |
| `Captura de pantalla 2026-11-17 153507.png` | Agenda de turnos — «Cada turno, bajo control.» | F7 |
| `Captura de pantalla 2026-11-17 153517.png` | Detalle de turno y lista de espera — «WOD · Fuerza + metcon» | F7 |
| `Captura de pantalla 2026-11-17 153526.png` | Membresías y pagos mensuales (vista ADMIN, «Registrar pago») | F7 / F4 |
| `Captura de pantalla 2026-11-17 153533.png` | Atleta · Explorar y reservar clases — «Hola, Lucía. Elegí tu próximo turno.» | F6 |
| `Captura de pantalla 2026-11-17 153540.png` | Atleta · Mis reservas — «Tu entrenamiento, organizado.» | F5 |

---

## 2. Copy recuperado por pantalla

### Panel general administrativo (F3)
- «Panel general administrativo»
- «BOX»
- «Todo listo para un día más fuerte.»
- Métricas visibles: `148`, `86`, `72%`, `10:12`, `76%`, `$6.240.000`, «18 membresías»
- Horarios visibles: `10:00`, `12:30`, `18:00`

### Gestión de usuarios (F7)
- «Gestión de usuarios» / «Usuarios»
- «El motor del box.»
- «Gestioná atletas, entrenadores y administradores desde un mismo lugar.»
- Contadores: `156` Todos, `148` Atletas, `6` Entrenadores, `2` Administradores
- Acción «+ Nuevo»; fila «Ver vencidas»; paginación «siguiente»
- Personas de ejemplo: Sofía Ríos, Bruno Méndez, Diego Castro, Camila Ruiz, Martín Vega, Valentina Paz, Molina
- Roles visibles: «Atleta», «Administrador»

### Agenda de turnos (F7)
- «Agenda de turnos»
- «Cada turno, bajo control.»
- «Clases, entrenadores y cupos de la semana. Seleccioná un día para gestionarlo.»
- Rango «26 - 30 de octubre»; filtro «Tipo: todos»; acción «Crear turno»
- Día «LUN 26»; filas WOD con horario `20:00`; coach «Carolina Molina»

### Detalle de turno y lista de espera (F7)
- «WOD · Fuerza + metcon»
- «Martes 27 de octubre de 2026 · 18:00 - 19:00 · Sala principal»
- Coach «Martín Vega»
- Secciones «Equipo», «Participantes», «AFORO 12/12», «3 atletas», «Lista de espera»
- Iniciales NA, CR, MS, JN; nombres Camila Ruiz, Silvina Costa, Tomás H, Julieta

### Membresías y pagos mensuales — ADMIN (F7/F4)
- «Membresías y pagos mensuales»
- «Vigencias claras. Cuentas al día.»
- Métricas `130`, `18`, `130`, `$6.240.000` (etiquetas no legibles → hipótesis)
- Acción «Registrar pago»

### Explorar y reservar clases (F6)
- «Atleta · Explorar y reservar clases»
- «Hola, Lucía. Elegí tu próximo turno.»
- «Octubre 2026»; días `26`, `28`, `29`, `Hoy, 27`, `31`, `01`
- Franja seleccionada «Hoy, 19:00»; horarios `12:30`, `17:00`, `18:00`, `19:00`, `20:00`
- Tarjetas «WOD» / «Fuerza + metcon»; chip «Libre mensual» en el encabezado

### Mis reservas (F5)
- «Atleta · Mis reservas»
- «Tu entrenamiento, organizado.»
- Agrupador «Reservas confirmadas» y sección «Lista de espera»
- «WOD · Fuerza metcon»; fechas `27`, `28`; diálogo «¿Cancelar tu reserva?»
- Chip «Libre mensual» en el encabezado

---

## 3. Observaciones de estructura

- La marca **BOX** aparece arriba a la izquierda en las 7 capturas.
- En pantallas de atleta el encabezado combina **chip de rol + título de sección**: `Atleta · Explorar y reservar clases`, `Atleta · Mis reservas`.
- En pantallas admin el menú lateral incluye: **Panel general, Agenda turnos, Usuarios, Membresías y pagos, Administración**.
- El saludo «Hola, Lucía…» pertenece a la pantalla de explorar clases (F6), no a un dashboard separado.
- No hay una pantalla de login entre las capturas; F1 se deriva del contrato del backend.

---

## 4. Paleta estimada (no definitiva)

El muestreo de color del OCR sugiere:

| Uso | Color aproximado |
|-----|------------------|
| Fondo claro | `#F0F0F0` |
| Texto / superficies oscuras | `#101010` – `#202020` |
| Acento azul | `#1090F0` |
| Acento lima | `#C0F060` |

> Confirmar valores exactos con el diseño antes de fijar tokens en `app/globals.css`.
