import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const BASE = process.env.BOX_BASE_URL ?? 'http://localhost:3001'
const API = process.env.BOX_API_URL ?? 'http://localhost:3000/api/v1'
const ATHLETE = {
  email: 'atleta@box-core.test',
  password: 'TestPassw0rd!',
}
/** Usuarios fijos: se reutilizan entre corridas para no agotar el rate limit de registro. */
const FILLER_EMAIL = 'e2e-f6-filler@box-core.test'
const NO_MEMBERSHIP_EMAIL = 'e2e-f6-no-membership@box-core.test'
const PREFIX = `E2E-${Date.now()}`
/** Sólo el día sembrado: evita que turnos previos fijen la selección por defecto. */
const CLASS_RANGE = `?from=${boxIso(1, 0).slice(0, 10)}&to=${boxIso(2, 0).slice(0, 10)}`
const TITLES = {
  libre: `${PREFIX} Fuerza + metcon`,
  dobleClick: `${PREFIX} Doble click`,
  lleno: `${PREFIX} Turno lleno`,
}

type Wod = {
  wod_id: string
  title: string
  start_time: string
  end_time: string
  available_slots: number
}

type Seed = {
  libre: Wod
  dobleClick: Wod
  lleno: Wod
  athleteToken: string
}

type BackendLogin = {
  access_token: string
  user_id: string
}

const loginCache = new Map<string, BackendLogin>()

function boxIso(daysAhead: number, localHour: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysAhead)
  // America/Asuncion es UTC-3 todo el año.
  date.setUTCHours(localHour + 3, 0, 0, 0)
  return date.toISOString()
}

function dayString(daysAhead: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + daysAhead)
  return date.toISOString().slice(0, 10)
}

async function api<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': randomUUID(),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  })
  const body = (await response.json()) as { data?: T; error?: { code: string; message: string } }
  if (!response.ok) {
    throw new Error(`${path}: ${body.error?.code ?? response.status} ${body.error?.message ?? ''}`)
  }
  return body.data as T
}

/** Los usuarios fijos ya iniciaron sesión en globalSetup; reutilizamos sus tokens. */
function storedToken(file: string): string {
  const stored = JSON.parse(readFileSync(`tests/e2e/${file}`, 'utf8')) as {
    cookies: Array<{ name: string; value: string }>
  }
  const token = stored.cookies.find((cookie) => cookie.name === 'box_session')?.value
  if (!token) throw new Error(`No hay token en tests/e2e/${file}`)
  return token
}

function adminToken(): string {
  return storedToken('storage.json')
}

async function registerAthlete(email: string): Promise<{ user_id: string }> {
  const response = await fetch(`${API}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: ATHLETE.password,
      full_name: `Atleta ${PREFIX}`,
      role: 'ATHLETE',
    }),
  })
  const body = (await response.json()) as { data?: { user_id: string } }
  if (!response.ok || !body.data) throw new Error(`No se pudo crear ${email}`)
  return body.data
}

async function loginRequest(
  email: string,
  password: string,
): Promise<BackendLogin | null> {
  const cached = loginCache.get(email)
  if (cached) return cached

  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })
  const body = (await response.json()) as {
    data?: { access_token?: string; user?: { user_id?: string } }
    error?: { code?: string; message?: string }
  }
  if (!response.ok) {
    if (body.error?.code === 'AUTH_INVALID_CREDENTIALS') return null
    throw new Error(
      `login ${email}: ${body.error?.code ?? response.status} ${body.error?.message ?? ''}`,
    )
  }
  const data = body.data
  if (!data?.access_token || !data.user?.user_id) {
    throw new Error(`login ${email}: respuesta sin token o user_id`)
  }
  const login = { access_token: data.access_token, user_id: data.user.user_id }
  loginCache.set(email, login)
  return login
}

async function backendLogin(email: string, password: string): Promise<BackendLogin> {
  const result = await loginRequest(email, password)
  if (!result) throw new Error(`No existe el usuario ${email}`)
  return result
}

/** Reutiliza el usuario si ya fue sembrado; sólo registra la primera vez. */
async function ensureAthlete(email: string): Promise<BackendLogin> {
  const file =
    email === FILLER_EMAIL
      ? 'filler-storage.json'
      : email === NO_MEMBERSHIP_EMAIL
        ? 'no-membership-storage.json'
        : ''
  if (file) {
    try {
      const token = storedToken(file)
      const me = await api<{ user_id: string }>('/users/me', token)
      const login = { access_token: token, user_id: me.user_id }
      loginCache.set(email, login)
      return login
    } catch {
      // Sin sesión pregenerada: se intenta login/registro abajo.
    }
  }

  const existing = await loginRequest(email, ATHLETE.password)
  if (existing) return existing
  await registerAthlete(email)
  return backendLogin(email, ATHLETE.password)
}

async function seed(): Promise<Seed> {
  const token = adminToken()
  const athleteToken = storedToken('athlete-storage.json')
  const me = await api<{ user_id: string }>('/users/me', athleteToken)
  const athlete = { access_token: athleteToken, user_id: me.user_id }

  const activeDates = { start_date: dayString(0), end_date: dayString(30) }
  await api('/memberships', token, {
    method: 'POST',
    body: JSON.stringify({
      user_id: athlete.user_id,
      plan_name: 'Libre mensual',
      amount_paid: 100,
      payment_method: 'CASH',
      ...activeDates,
    }),
  })

  const createWod = (title: string, hour: number, capacity: number) =>
    api<Wod>('/wods', token, {
      method: 'POST',
      body: JSON.stringify({
        title,
        start_time: boxIso(1, hour),
        end_time: boxIso(1, hour + 1),
        max_capacity: capacity,
      }),
    })

  const libre = await createWod(TITLES.libre, 17, 5)
  const dobleClick = await createWod(TITLES.dobleClick, 19, 5)
  const lleno = await createWod(TITLES.lleno, 20, 1)

  // Un segundo atleta con membresía ocupa el único cupo del turno lleno.
  const filler = await ensureAthlete(FILLER_EMAIL)
  await api('/memberships', token, {
    method: 'POST',
    body: JSON.stringify({
      user_id: filler.user_id,
      plan_name: 'Libre mensual',
      amount_paid: 100,
      payment_method: 'CASH',
      ...activeDates,
    }),
  })
  await api('/bookings', token, {
    method: 'POST',
    body: JSON.stringify({ wod_id: lleno.wod_id, user_id: filler.user_id }),
  })
  const fullLleno = await api<Wod>(`/wods/${lleno.wod_id}`, token)

  return { libre, dobleClick, lleno: fullLleno, athleteToken: athlete.access_token }
}

/** La cookie de sesión ya viene del login del seed; la reutilizamos en cada test. */
async function loginAs(page: Page, token: string) {
  await page.context().addCookies([
    { name: 'box_session', value: token, url: BASE },
  ])
}

/**
 * Las respuestas del API se fijan también en el navegador (page.route) para que
 * cualquier fetch client-side sea determinista; la agenda del Server Component
 * se siembra con `seed()` y se lee del backend real.
 */
async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/memberships/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              membership_id: randomUUID(),
              plan_name: 'Libre mensual',
              amount_paid: 100,
              start_date: dayString(0),
              end_date: dayString(30),
              status: 'ACTIVE',
              payment_method: 'CASH',
              notes: null,
              created_by: null,
              created_at: new Date().toISOString(),
            },
          ],
        }),
      })
      return
    }
    if (url.includes('/wods')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      })
      return
    }
    await route.continue()
  })
}

async function countActionPosts(page: Page): Promise<() => number> {
  let posts = 0
  await page.route('**/classes*', async (route) => {
    if (route.request().method() === 'POST') posts += 1
    await route.continue()
  })
  return () => posts
}

test.describe('F6 · Explorar y reservar clases', () => {
  test.describe.configure({ mode: 'serial' })

  let seeded: Seed

  test.beforeAll(async () => {
    seeded = await seed()
  })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, seeded.athleteToken)
    await mockApi(page)
    await page.goto(`${BASE}/classes${CLASS_RANGE}`)
    await expect(
      page.getByRole('heading', { name: /Elegí tu próximo turno/ }),
    ).toBeVisible()
  })

  test('la agenda muestra un título real y el badge Libre', async ({ page }) => {
    const card = page.locator('[data-testid="class-card"]').filter({
      hasText: TITLES.libre,
    })
    await expect(card).toBeVisible()
    await expect(card.getByTestId('slot-badge')).toHaveText('Libre')
    await expect(card.getByRole('button', { name: 'Reservar' })).toBeEnabled()
  })

  test('reserva con cupo: toast y cupo actualizado', async ({ page }) => {
    const card = page.locator('[data-testid="class-card"]').filter({
      hasText: TITLES.libre,
    })
    await expect(card).toContainText('5 cupos disponibles')
    await card.getByRole('button', { name: 'Reservar' }).click()
    await expect(page.getByTestId('booking-toast')).toContainText('Reserva confirmada')
    await expect(card).toContainText('4 cupos disponibles')
  })

  test('turno lleno: entrada a la lista de espera con posición', async ({ page }) => {
    await page.getByRole('button', { name: '20:00' }).click()
    const card = page.locator('[data-testid="class-card"]').filter({
      hasText: TITLES.lleno,
    })
    await expect(card.getByTestId('slot-badge')).toHaveText('Lista de espera')
    await card.getByRole('button', { name: 'Entrar en lista de espera' }).click()
    await expect(page.getByTestId('booking-toast')).toContainText(/posición/i)
  })

  test('doble click genera una sola reserva', async ({ page }) => {
    const posts = await countActionPosts(page)
    await page.getByRole('button', { name: '19:00' }).click()
    const button = page
      .locator('[data-testid="class-card"]')
      .filter({ hasText: TITLES.dobleClick })
      .getByTestId('book-button')
    await button.dblclick()
    await expect(page.getByTestId('booking-toast')).toContainText('Reserva confirmada')
    expect(posts()).toBe(1)
  })

  test('sin membresía: aviso y CTA sin POST', async ({ page }) => {
    const { access_token: token } = await ensureAthlete(NO_MEMBERSHIP_EMAIL)

    const posts = await countActionPosts(page)
    await loginAs(page, token)
    await page.goto(`${BASE}/classes${CLASS_RANGE}`)

    const card = page.locator('[data-testid="class-card"]').filter({
      hasText: TITLES.libre,
    })
    await expect(card.getByRole('alert')).toContainText(/membres[ií]a activa/i)
    await expect(card.getByRole('link', { name: 'Ver membresías' })).toHaveAttribute(
      'href',
      '/memberships',
    )
    await expect(card.getByTestId('book-button')).toBeDisabled()
    expect(posts()).toBe(0)
  })

  test('los turnos sembrados estás disponibles en el rango', async () => {
    expect(seeded.libre.available_slots).toBe(5)
    expect(seeded.lleno.available_slots).toBe(0)
    expect(seeded.dobleClick.available_slots).toBe(5)
  })
})
