export const BOX_TIME_ZONE = 'America/Asuncion'

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function partsInTimeZone(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const values = formatter.formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(values.find((part) => part.type === type)?.value ?? '0')
  const hour = value('hour') === 24 ? 0 : value('hour')
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour,
    minute: value('minute'),
    second: value('second'),
  }
}

function offsetMs(date: Date, timeZone: string): number {
  const parts = partsInTimeZone(date, timeZone)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** Convierte fecha y hora wall-clock del box a un instante UTC ISO con Z. */
export function zonedDateTimeToIso(
  date: string,
  time: string,
  timeZone = BOX_TIME_ZONE,
): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const wall = Date.UTC(year, month - 1, day, hour, minute, 0)
  const firstGuess = wall - offsetMs(new Date(wall), timeZone)
  const utc = wall - offsetMs(new Date(firstGuess), timeZone)
  return new Date(utc).toISOString()
}

const pad = (value: number) => String(value).padStart(2, '0')

export function toDateString(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function getBoxToday(now = new Date()): string {
  const parts = partsInTimeZone(now, BOX_TIME_ZONE)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export type WeekRange = {
  monday: Date
  friday: Date
  saturday: Date
  fromIso: string
  toIso: string
  label: string
}

/** Lunes → viernes del box. `to` es sábado 00:00 porque el backend lo trata como exclusivo. */
export function getWeekRange(today = getBoxToday()): WeekRange {
  const [year, month, day] = today.split('-').map(Number)
  const base = new Date(Date.UTC(year, month - 1, day))
  const weekday = base.getUTCDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  const monday = new Date(base)
  monday.setUTCDate(base.getUTCDate() + mondayOffset)
  const friday = new Date(monday)
  friday.setUTCDate(monday.getUTCDate() + 4)
  const saturday = new Date(monday)
  saturday.setUTCDate(monday.getUTCDate() + 5)

  const startDay = new Intl.DateTimeFormat('es-PY', {
    day: 'numeric',
    timeZone: 'UTC',
  }).format(monday)
  const endDay = new Intl.DateTimeFormat('es-PY', {
    day: 'numeric',
    timeZone: 'UTC',
  }).format(friday)
  const monthLabel = new Intl.DateTimeFormat('es-PY', {
    month: 'long',
    timeZone: 'UTC',
  }).format(friday)

  return {
    monday,
    friday,
    saturday,
    fromIso: zonedDateTimeToIso(toDateString(monday), '00:00'),
    toIso: zonedDateTimeToIso(toDateString(saturday), '00:00'),
    label: `${startDay} - ${endDay} de ${monthLabel}`,
  }
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BOX_TIME_ZONE,
  }).format(new Date(iso))
}

export function formatDayHeader(iso: string): string {
  const date = new Date(iso)
  const weekday = new Intl.DateTimeFormat('es-PY', {
    weekday: 'short',
    timeZone: BOX_TIME_ZONE,
  })
    .format(date)
    .replace('.', '')
    .toUpperCase()
  const day = new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    timeZone: BOX_TIME_ZONE,
  }).format(date)
  return `${weekday} ${day}`
}

export function formatCreatedAt(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const dateParts = partsInTimeZone(date, BOX_TIME_ZONE)
  const today = getBoxToday(now)
  const localDate = `${dateParts.year}-${pad(dateParts.month)}-${pad(dateParts.day)}`
  const time = formatTime(iso)
  if (localDate === today) return `Hoy, ${time}`
  const weekday = new Intl.DateTimeFormat('es-PY', {
    weekday: 'short',
    timeZone: BOX_TIME_ZONE,
  })
    .format(date)
    .replace('.', '')
  return `${weekday} ${dateParts.day}, ${time}`
}

export function formatEventDate(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const longDate = new Intl.DateTimeFormat('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: BOX_TIME_ZONE,
  }).format(start)
  const capitalized = longDate.charAt(0).toUpperCase() + longDate.slice(1)
  return `${capitalized} · ${formatTime(startIso)} - ${formatTime(endIso)}`
}

/** Alias usado por F6. */
export const boxToday = getBoxToday

/** Alias usado por F6: fecha wall-clock del box + hora → ISO UTC. */
export const toUtcIso = zonedDateTimeToIso

/** Alias usado por F6. */
export const formatSlotTime = formatTime

/** Etiqueta corta del día del turno en zona del box. */
export function formatDayLabel(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const localDate = `${partsInTimeZone(date, BOX_TIME_ZONE).year}-${pad(
    partsInTimeZone(date, BOX_TIME_ZONE).month,
  )}-${pad(partsInTimeZone(date, BOX_TIME_ZONE).day)}`
  if (localDate === getBoxToday(now)) return 'Hoy'
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  if (localDate === getBoxToday(tomorrow)) return 'Mañana'
  return new Intl.DateTimeFormat('es-PY', {
    weekday: 'short',
    timeZone: BOX_TIME_ZONE,
  })
    .format(date)
    .replace('.', '')
}

export function formatCalendarDate(date: string): string {
  return new Intl.DateTimeFormat('es-PY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}
