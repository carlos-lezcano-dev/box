import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, request, test } from '@playwright/test'
import type { APIRequestContext, Page } from '@playwright/test'

const BASE = process.env.BOX_BASE_URL ?? 'http://localhost:3001'
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
const PASSWORD = 'TestPassw0rd!'
const PREFIX = `E2E-F7-${Date.now()}`
const AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const ATHLETE_EMAIL = 'atleta@box-core.test'

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>
type Meta = { page: number; limit: number; total: number; total_pages: number }
type Envelope<T> = {
  success?: boolean
  data?: T
  meta?: Meta
  error?: { code?: string; message?: string }
  request_id?: string
}
type WodDto = {
  wod_id: string
  title: string
  max_capacity: number
  confirmed_count: number
  waitlist_count: number
}
type UserDto = { user_id: string; email: string; full_name: string; role: string }
type RosterEntryDto = {
  booking_id: string
  user_id: string
  full_name: string
  position?: number
}
type RosterDto = {
  wod_id: string
  max_capacity: number
  confirmed_count: number
  waitlist_count: number
  confirmed: RosterEntryDto[]
  waitlist: RosterEntryDto[]
}
type MembershipDto = {
  membership_id: string
  plan_name: string
  user_id: string
  status: string
}
type Person = { user_id: string; email: string; full_name: string }

let admin: APIRequestContext
let publicApi: APIRequestContext
let seeded: {
  today: string
  wodDate: string
  filterInWeek: boolean
  filterTitles: [string, string]
  freshUser: Person
  coachEmail: string
  detail: {
    wodId: string
    capacity: number
    confirmedCount: number
    waitlistCount: number
    athlete1: Person
    athlete2: Person
  }
  cancelled: { id: string; planName: string; userId: string }
}

function adminToken(): string {
  const stored = JSON.parse(readFileSync('tests/e2e/storage.json', 'utf8')) as {
    cookies: Array<{ name: string; value: string }>
  }
  const token = stored.cookies.find((cookie) => cookie.name === 'box_session')?.value
  expect(token, 'globalSetup debe dejar la cookie ADMIN en storage.json').toBeTruthy()
  return token ?? ''
}

async function call<T>(
  api: APIRequestContext,
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    data?: unknown
    headers?: Record<string, string>
  } = {},
) {
  // `baseURL` con /api/v1 + una ruta absoluta resolvería a /wods en el root.
  const url = path.startsWith('http') ? path : `${API}${path}`
  const response = await api.fetch(url, {
    method: options.method ?? 'GET',
    data: options.data,
    headers: options.headers,
  })
  const body = (await response.json().catch(() => ({}))) as Envelope<T>
  return { status: response.status(), body }
}

const pad = (value: number) => String(value).padStart(2, '0')

function isoDate(date: { year: number; month: number; day: number }): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`
}

function boxParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Asuncion',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')
  return { year: value('year'), month: value('month'), day: value('day') }
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days))
  return isoDate({
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  })
}

function weekday(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)).getUTCDay()
}

/** America/Asuncion es UTC-3 durante todo 2026. */
function localIso(date: string, hour: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour + 3)).toISOString()
}

function mondayOf(date: string): string {
  const day = weekday(date)
  return addDays(date, day === 0 ? -6 : 1 - day)
}

function weekLabel(today: string): string {
  const monday = mondayOf(today)
  const friday = addDays(monday, 4)
  const dayFormat = new Intl.DateTimeFormat('es-PY', { day: 'numeric', timeZone: 'UTC' })
  const monthFormat = new Intl.DateTimeFormat('es-PY', { month: 'long', timeZone: 'UTC' })
  return `${dayFormat.format(new Date(`${monday}T00:00:00Z`))} - ${dayFormat.format(
    new Date(`${friday}T00:00:00Z`),
  )} de ${monthFormat.format(new Date(`${friday}T00:00:00Z`))}`
}

/** Primer día hábil del box con las 20:00 en el futuro. */
function futureWeekDate(today: string): string {
  for (let offset = 1; offset <= 8; offset += 1) {
    const candidate = addDays(today, offset)
    const day = weekday(candidate)
    if (day >= 1 && day <= 5 && new Date(localIso(candidate, 20)).getTime() > Date.now() + 3_600_000) {
      return candidate
    }
  }
  return addDays(today, 8)
}

async function ensureUser(email: string, fullName: string): Promise<Person> {
  // La consulta ADMIN evita un login nuevo por cada usuario sembrado (rate limit).
  const existing = await call<UserDto[]>(
    admin,
    `/users?q=${encodeURIComponent(email)}&limit=100`,
  )
  const found = existing.body.data?.find((user) => user.email === email)
  if (found) return { user_id: found.user_id, email, full_name: found.full_name }

  const registered = await call<{ user_id: string }>(publicApi, '/users/register', {
    method: 'POST',
    data: { email, password: PASSWORD, full_name: fullName, role: 'ATHLETE' },
  })
  expect(registered.status, JSON.stringify(registered.body)).toBe(201)
  return { user_id: registered.body.data?.user_id ?? '', email, full_name: fullName }
}

async function ensureMembership(userId: string, planName: string, today: string) {
  const created = await call(admin, '/memberships', {
    method: 'POST',
    headers: { 'Idempotency-Key': randomUUID() },
    data: {
      user_id: userId,
      plan_name: planName,
      amount_paid: 150000,
      start_date: today,
      end_date: addDays(today, 30),
      payment_method: 'CASH',
    },
  })
  expect(created.status, JSON.stringify(created.body)).toBe(201)
  return created.body.data as MembershipDto
}

async function createWod(title: string, date: string, capacity: number): Promise<WodDto> {
  const created = await call<WodDto>(admin, '/wods', {
    method: 'POST',
    data: {
      title,
      start_time: localIso(date, 20),
      end_time: localIso(date, 21),
      max_capacity: capacity,
    },
  })
  expect(created.status, JSON.stringify(created.body)).toBe(201)
  expect(created.body.data?.wod_id, 'POST /wods sin wod_id').toBeTruthy()
  return created.body.data as WodDto
}

async function loginState(email: string): Promise<StorageState> {
  if (email === ATHLETE_EMAIL) {
    const state = JSON.parse(
      readFileSync('tests/e2e/athlete-storage.json', 'utf8'),
    ) as StorageState
    return {
      ...state,
      cookies: state.cookies.map((cookie) => ({ ...cookie, secure: false })),
    }
  }

  const context = await request.newContext({ baseURL: BASE })
  try {
    const response = await context.post('/api/auth/login', {
      data: { email, password: PASSWORD },
    })
    expect(response.ok(), `login de ${email}: ${response.status()}`).toBeTruthy()
    const state = await context.storageState()
    // Los tests corren sobre http://localhost; las cookies Secure no se enviarían.
    return {
      ...state,
      cookies: state.cookies.map((cookie) => ({ ...cookie, secure: false })),
    }
  } finally {
    await context.dispose()
  }
}

async function openSidebarIfNeeded(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    const menu = page.getByRole('button', { name: 'Abrir menú' })
    if (await menu.isVisible()) await menu.click()
  }
}

async function expectNoAaViolations(page: Page, label: string, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(AA_TAGS)
  if (include) builder = builder.include(include)
  const { violations } = await builder.analyze()
  expect(
    violations.map(
      (violation) =>
        `${violation.id}: ${violation.help} → ${violation.nodes
          .map((node) => node.target.join(' '))
          .join(', ')}`,
    ),
    `Violaciones AA en ${label}`,
  ).toEqual([])
}

test.describe.serial('F7 · Administración', () => {
  test.beforeAll(async () => {
    admin = await request.newContext({
      baseURL: API,
      extraHTTPHeaders: { Authorization: `Bearer ${adminToken()}` },
    })
    publicApi = await request.newContext({ baseURL: API })

    const today = isoDate(boxParts())
    const wodDate = futureWeekDate(today)
    const monday = mondayOf(today)
    const filterInWeek = wodDate >= monday && wodDate <= addDays(monday, 5)
    const filterTitles: [string, string] = [
      `FUERZA-${PREFIX}`,
      `MOVILIDAD-${PREFIX}`,
    ]
    await createWod(filterTitles[0], wodDate, 8)
    await createWod(filterTitles[1], wodDate, 8)

    const freshEmail = `e2e-f7-hoy-${Date.now()}@box-core.test`
    const freshName = `${PREFIX} Alta hoy`
    const fresh = await call<{ user_id: string }>(publicApi, '/users/register', {
      method: 'POST',
      data: { email: freshEmail, password: PASSWORD, full_name: freshName, role: 'ATHLETE' },
    })
    expect(fresh.status, JSON.stringify(fresh.body)).toBe(201)

    const athlete1 = await ensureUser('e2e-f7-roster-1@box-core.test', `${PREFIX} Participante`)
    const athlete2 = await ensureUser('e2e-f7-roster-2@box-core.test', `${PREFIX} En espera`)
    await ensureMembership(athlete1.user_id, `${PREFIX} Rostro 1`, today)
    await ensureMembership(athlete2.user_id, `${PREFIX} Rostro 2`, today)

    const detailWod = await createWod(`${PREFIX} Detalle roster`, addDays(wodDate, 1), 1)
    for (const athlete of [athlete1, athlete2]) {
      const booking = await call(admin, '/bookings', {
        method: 'POST',
        headers: { 'Idempotency-Key': randomUUID() },
        data: { wod_id: detailWod.wod_id, user_id: athlete.user_id },
      })
      expect(booking.status, JSON.stringify(booking.body)).toBeLessThan(300)
    }
    const roster = await call<RosterDto>(admin, `/wods/${detailWod.wod_id}/bookings`)
    expect(roster.status).toBe(200)

    const cancelledPlan = `${PREFIX} Cancelada`
    const cancelledMembership = await ensureMembership(athlete1.user_id, cancelledPlan, today)
    const cancelled = await call(
      admin,
      `/memberships/${cancelledMembership.membership_id}/status`,
      { method: 'PATCH', data: { status: 'CANCELLED' } },
    )
    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200)

    seeded = {
      today,
      wodDate,
      filterInWeek,
      filterTitles,
      freshUser: {
        user_id: fresh.body.data?.user_id ?? '',
        email: freshEmail,
        full_name: freshName,
      },
      coachEmail: `e2e-f7-coach-${Date.now()}@box-core.test`,
      detail: {
        wodId: detailWod.wod_id,
        capacity: detailWod.max_capacity,
        confirmedCount: roster.body.data?.confirmed_count ?? 0,
        waitlistCount: roster.body.data?.waitlist_count ?? 0,
        athlete1,
        athlete2,
      },
      cancelled: {
        id: cancelledMembership.membership_id,
        planName: cancelledPlan,
        userId: athlete1.user_id,
      },
    }
  })

  test.afterAll(async () => {
    await admin?.dispose()
    await publicApi?.dispose()
  })

  test('ADMIN ve los cinco ítems y «Panel general» lleva a / sin duplicar F3', async ({ page }) => {
    await page.goto('/admin')

    const sidebar = page.getByRole('navigation', { name: 'Navegación principal' })
    for (const label of [
      'Panel general',
      'Agenda turnos',
      'Usuarios',
      'Membresías y pagos',
      'Administración',
    ]) {
      await expect(sidebar.getByRole('link', { name: label, exact: true })).toBeVisible()
    }
    await expect(
      page.getByRole('heading', { name: 'Panel general administrativo' }),
    ).toHaveCount(0)

    await openSidebarIfNeeded(page)
    await sidebar.getByRole('link', { name: 'Panel general' }).click()
    await expect(page).toHaveURL(new URL('/', BASE).toString())
    await expect(
      page.getByRole('heading', { name: 'Panel general administrativo' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Panel general administrativo' }),
    ).toHaveCount(1)
  })

  test('/admin/users muestra métricas de meta.total, filas, «Hoy» y paginación', async ({
    page,
  }) => {
    const [all, athletes, coaches, admins, list] = await Promise.all([
      call(admin, '/users?limit=1'),
      call(admin, '/users?limit=1&role=ATHLETE'),
      call(admin, '/users?limit=1&role=COACH'),
      call(admin, '/users?limit=1&role=ADMIN'),
      call(admin, '/users?page=1&limit=20'),
    ])

    await page.goto('/admin/users')

    const metrics: Array<[string, number | undefined]> = [
      ['Todos', all.body.meta?.total],
      ['Atletas', athletes.body.meta?.total],
      ['Entrenadores', coaches.body.meta?.total],
      ['Administradores', admins.body.meta?.total],
    ]
    for (const [label, total] of metrics) {
      const card = page.getByText(label, { exact: true }).locator('..')
      await expect(card, `Métrica ${label}`).toContainText(String(total ?? 0))
    }

    const totalPages = list.body.meta?.total_pages ?? 0
    const nextLink = page.getByRole('link', { name: 'siguiente' })
    if (totalPages > 1) {
      await expect(nextLink).toHaveAttribute('href', '/admin/users?page=2')
    } else {
      await expect(nextLink).toHaveCount(0)
    }

    await page.goto(`/admin/users?q=${encodeURIComponent(seeded.freshUser.email)}`)
    const row = page.getByRole('row').filter({ hasText: seeded.freshUser.full_name })
    await expect(row).toBeVisible()
    await expect(row).toContainText('Atleta')
    await expect(row).toContainText(/Hoy, \d{2}:\d{2}/)
  })

  test('alta con role=COACH, USER_EMAIL_TAKEN y sin login automático', async ({ page }) => {
    await page.goto('/admin/users')
    const before = (await page.context().cookies(BASE)).find(
      (cookie) => cookie.name === 'box_session',
    )?.value
    const email = seeded.coachEmail
    const fullName = `${PREFIX} Coach`

    await page.getByRole('button', { name: '+ Nuevo' }).click()
    const dialog = page.getByRole('dialog', { name: '+ Nuevo usuario' })
    await dialog.getByLabel('Nombre completo').fill(fullName)
    await dialog.getByLabel('Email').fill(email)
    await dialog.getByLabel('Contraseña').fill(PASSWORD)
    await dialog.getByLabel('Rol').selectOption('COACH')
    await dialog.getByRole('button', { name: 'Crear usuario' }).click()
    await expect(dialog).toHaveCount(0)

    const after = (await page.context().cookies(BASE)).find(
      (cookie) => cookie.name === 'box_session',
    )?.value
    expect(after, 'El alta no debe iniciar sesión con el usuario creado').toBe(before)

    const created = await call<UserDto[]>(
      admin,
      `/users?role=COACH&q=${encodeURIComponent(email)}`,
    )
    expect(
      created.body.data?.some((user) => user.email === email && user.role === 'COACH'),
      `No se creó ${email} como COACH`,
    ).toBeTruthy()

    await page.getByRole('button', { name: '+ Nuevo' }).click()
    const duplicate = page.getByRole('dialog', { name: '+ Nuevo usuario' })
    await duplicate.getByLabel('Nombre completo').fill(`${PREFIX} Duplicado`)
    await duplicate.getByLabel('Email').fill(email)
    await duplicate.getByLabel('Contraseña').fill(PASSWORD)
    await duplicate.getByRole('button', { name: 'Crear usuario' }).click()

    await expect(duplicate.getByRole('alert')).toContainText('Ya existe un usuario con ese email.')
    await expect(duplicate.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  test('agenda con rango semanal, «Tipo: todos» y creación válida/inválida', async ({
    page,
  }) => {
    await page.goto('/admin/schedule')

    await expect(page.getByText(weekLabel(seeded.today), { exact: true })).toBeVisible()
    const filter = page.getByRole('combobox', { name: /Tipo/ })
    await expect(filter).toHaveValue('todos')
    expect(page.url()).not.toContain('type=')

    if (seeded.filterInWeek) {
      await filter.selectOption({ label: seeded.filterTitles[0] })
      await expect(page.getByRole('link', { name: seeded.filterTitles[0] })).toBeVisible()
      await expect(page.getByRole('link', { name: seeded.filterTitles[1] })).toHaveCount(0)
      expect(page.url(), 'El filtro es local: no debe enviar type').not.toContain('type=')
      await filter.selectOption('todos')
    }

    const validTitle = `${PREFIX} UI válido`
    await page.getByRole('button', { name: 'Crear turno' }).click()
    const dialog = page.getByRole('dialog', { name: 'Crear turno' })
    await dialog.getByLabel('Título').fill(validTitle)
    await dialog.getByLabel('Fecha').fill(seeded.wodDate)
    await dialog.getByLabel('Inicio').fill('20:00')
    await dialog.getByLabel('Fin').fill('21:00')
    await dialog.getByLabel('Aforo').fill('8')
    await dialog.getByRole('button', { name: 'Crear turno' }).click()
    await expect(dialog).toHaveCount(0)

    const created = await call<WodDto[]>(
      admin,
      `/wods?from=${localIso(seeded.wodDate, 0)}&to=${localIso(addDays(seeded.wodDate, 1), 0)}&limit=100`,
    )
    expect(
      created.body.data?.some((wod) => wod.title === validTitle),
      `No se creó el turno ${validTitle}`,
    ).toBeTruthy()

    await page.getByRole('button', { name: 'Crear turno' }).click()
    const invalid = page.getByRole('dialog', { name: 'Crear turno' })
    await invalid.getByLabel('Título').fill(`${PREFIX} UI inválido`)
    await invalid.getByLabel('Fecha').fill(seeded.wodDate)
    await invalid.getByLabel('Inicio').fill('21:00')
    await invalid.getByLabel('Fin').fill('20:00')
    await invalid.getByRole('button', { name: 'Crear turno' }).click()

    await expect(invalid.getByRole('alert')).toContainText(
      'Revisá el orden y la duración de los horarios.',
    )
    await expect(invalid).toBeVisible()
    await invalid.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('detalle con AFORO real, waitlist ordenada y promoción al cancelar', async ({
    page,
  }) => {
    const { detail } = seeded
    await page.goto(`/admin/schedule/${detail.wodId}`)

    await expect(
      page.getByRole('heading', { name: 'Detalle de turno y lista de espera' }),
    ).toBeVisible()
    await expect(
      page.getByText(`AFORO ${detail.confirmedCount}/${detail.capacity}`, { exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Participantes' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lista de espera', exact: true })).toBeVisible()

    const waitlist = page
      .getByRole('heading', { name: 'Lista de espera', exact: true })
      .locator('xpath=ancestor::section[1]')
    await expect(waitlist).toContainText(detail.athlete2.full_name)
    await expect(waitlist).toContainText('Posición 1')

    const participants = page
      .getByRole('heading', { name: 'Participantes' })
      .locator('xpath=ancestor::section[1]')
    await participants.getByRole('button', { name: 'Cancelar' }).first().click()

    const dialog = page.getByRole('dialog', { name: 'Cancelar reserva' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Cancelar reserva' }).click()

    await expect(page.getByRole('status')).toContainText(
      'Se promovió a la siguiente persona de la lista de espera',
    )
    await expect(page.getByText('No hay atletas en espera.')).toBeVisible()

    const finalRoster = await call<RosterDto>(admin, `/wods/${detail.wodId}/bookings`)
    expect(
      finalRoster.body.data?.confirmed.some((entry) => entry.user_id === detail.athlete2.user_id),
      'La atleta en espera debió ser promovida',
    ).toBeTruthy()
  })

  test('membresías ADMIN: métricas pendientes, registro de pago y transición inválida', async ({
    page,
  }) => {
    await page.goto('/admin/memberships')

    await expect(
      page.getByRole('heading', { level: 1, name: 'Membresías y pagos mensuales' }),
    ).toBeVisible()
    await expect(page.getByText('Vigencias claras. Cuentas al día.')).toBeVisible()
    await expect(page.getByText('Pendiente de confirmación').first()).toBeVisible()

    const planName = `${PREFIX} Pago UI`
    await page.getByRole('button', { name: 'Registrar pago' }).click()
    const dialog = page.getByRole('dialog', { name: 'Registrar pago' })
    await dialog.getByLabel('Atleta').selectOption(seeded.detail.athlete1.user_id)
    await dialog.getByLabel('Plan').fill(planName)
    await dialog.getByLabel('Importe').fill('150000')
    await dialog.getByLabel('Desde').fill(seeded.today)
    await dialog.getByLabel('Hasta').fill(addDays(seeded.today, 30))
    await dialog.getByRole('button', { name: 'Registrar pago' }).click()
    await expect(dialog).toHaveCount(0)

    const saved = await call<MembershipDto[]>(
      admin,
      `/memberships?user_id=${seeded.cancelled.userId}&limit=100`,
    )
    expect(
      saved.body.data?.some((membership) => membership.plan_name === planName),
      `No se registró el pago ${planName}`,
    ).toBeTruthy()

    // La UI no ofrece CANCELLED → ACTIVE: se verifica en la fila y en el backend.
    await page.goto(
      `/admin/memberships?status=CANCELLED&user_id=${seeded.cancelled.userId}`,
    )
    const row = page.getByRole('row').filter({ hasText: seeded.cancelled.planName })
    await expect(row).toBeVisible()
    await expect(row).toContainText('Cancelada')
    await expect(row.getByRole('combobox')).toHaveCount(0)

    const rejected = await call(
      admin,
      `/memberships/${seeded.cancelled.id}/status`,
      { method: 'PATCH', data: { status: 'ACTIVE' } },
    )
    expect(rejected.status).toBe(409)
    expect(rejected.body.error?.code).toBe('MEMBERSHIP_INVALID_TRANSITION')
  })

  test('ATHLETE no ve el menú ADMIN, /admin/users está bloqueado y un 401 va a /login', async ({
    browser,
  }) => {
    const athleteState = await loginState(ATHLETE_EMAIL)
    const athleteContext = await browser.newContext({
      baseURL: BASE,
      storageState: athleteState,
    })
    const invalidContext = await browser.newContext({ baseURL: BASE })
    try {
      const athletePage = await athleteContext.newPage()
      await athletePage.goto('/')
      await expect(athletePage).toHaveURL(/\/classes(\?|$)/)
      await openSidebarIfNeeded(athletePage)
      const sidebar = athletePage.getByRole('navigation', { name: 'Navegación principal' })
      await expect(sidebar.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
      await expect(sidebar.getByRole('link', { name: 'Panel general' })).toHaveCount(0)

      await athletePage.goto('/admin/users')
      await expect(
        athletePage.getByRole('heading', { name: 'Acceso restringido' }),
      ).toBeVisible()
      await expect(
        athletePage.getByRole('heading', { name: 'Gestión de usuarios' }),
      ).toHaveCount(0)

      await invalidContext.addCookies([
        {
          name: 'box_session',
          value: 'token-invalido-para-e2e',
          url: BASE,
        },
      ])
      const invalidPage = await invalidContext.newPage()
      await invalidPage.goto('/admin/users')
      await expect(invalidPage).toHaveURL(/\/login(\?|$)/)
    } finally {
      await athleteContext.close()
      await invalidContext.close()
    }
  })

  test('axe AA: tablas, filtros y diálogos sin violaciones', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByRole('table')).toBeVisible()
    await expectNoAaViolations(page, 'tabla y filtros de usuarios', 'main')

    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectNoAaViolations(page, 'diálogo de alta de usuarios', '[role="dialog"]')

    await page.goto('/admin/schedule')
    await expect(page.getByRole('combobox', { name: /Tipo/ })).toBeVisible()
    await expectNoAaViolations(page, 'filtros de la agenda', 'main')

    await page.getByRole('button', { name: 'Crear turno' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expectNoAaViolations(page, 'diálogo de creación de turno', '[role="dialog"]')
  })
})
