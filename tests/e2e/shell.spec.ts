import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, request, test } from '@playwright/test'
import type { APIRequestContext, Browser } from '@playwright/test'

const BASE = process.env.BOX_BASE_URL ?? 'http://localhost:3001'
const API = process.env.BOX_API_URL ?? 'http://localhost:3000'
const V1 = `${API}/api/v1`
const PLAN = 'Libre mensual'
const COOKIE = 'box_session'

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>

type MembershipDTO = {
  plan_name: string
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
  end_date: string
}

function dayPlus(days: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

async function adminToken(): Promise<string> {
  // globalSetup ya inició sesión como ADMIN y dejó la cookie en storage.json.
  const stored = JSON.parse(await readFile('tests/e2e/storage.json', 'utf8')) as {
    cookies?: Array<{ name: string; value: string }>
  }
  const token = stored.cookies?.find((cookie) => cookie.name === COOKIE)?.value
  if (!token) throw new Error('No hay token de admin en tests/e2e/storage.json')
  return token
}

/** globalSetup ya autenticó al atleta; reutilizamos su cookie sin otro login. */
async function loginAthlete() {
  const state = JSON.parse(
    await readFile('tests/e2e/athlete-storage.json', 'utf8'),
  ) as StorageState
  return {
    ...state,
    cookies: state.cookies.map((cookie) => ({ ...cookie, secure: false })),
  }
}

function tokenFrom(state: { cookies: Array<{ name: string; value: string }> }): string {
  const token = state.cookies.find((cookie) => cookie.name === COOKIE)?.value
  if (!token) throw new Error(`Falta la cookie ${COOKIE}`)
  return token
}

let athleteState: Awaited<ReturnType<typeof loginAthlete>>
let activePlan: string

test.beforeAll(async () => {
  athleteState = await loginAthlete()
  activePlan = PLAN

  const athleteHeaders = { Authorization: `Bearer ${tokenFrom(athleteState)}` }
  const backend = await request.newContext({ baseURL: API })
  try {
    const mine = await backend.get(`${V1}/memberships/me`, { headers: athleteHeaders })
    if (mine.ok()) {
      const body = (await mine.json()) as { data?: MembershipDTO[] | MembershipDTO }
      const list = Array.isArray(body.data) ? body.data : body.data ? [body.data] : []
      const current = list
        .filter((item) => item.status === 'ACTIVE')
        .sort((a, b) => a.end_date.localeCompare(b.end_date))[0]
      if (current) {
        activePlan = current.plan_name
        return
      }
    }

    const me = await backend.get(`${V1}/users/me`, { headers: athleteHeaders })
    expect(me.ok(), `GET /users/me falló: ${me.status()}`).toBeTruthy()
    const { data: user } = (await me.json()) as { data: { user_id: string } }

    const admin = await request.newContext({ baseURL: API })
    try {
      const created = await admin.post(`${V1}/memberships`, {
        data: {
          user_id: user.user_id,
          plan_name: PLAN,
          amount_paid: 100,
          payment_method: 'CASH',
          start_date: dayPlus(0),
          end_date: dayPlus(30),
        },
        headers: {
          Authorization: `Bearer ${await adminToken()}`,
          'Idempotency-Key': `f2-shell-${dayPlus(0)}`,
        },
      })
      expect(created.ok(), `POST /memberships falló: ${created.status()}`).toBeTruthy()
    } finally {
      await admin.dispose()
    }
  } finally {
    await backend.dispose()
  }
})

async function athleteContext(browser: Browser) {
  const context = await browser.newContext({
    baseURL: BASE,
    storageState: athleteState,
    viewport: { width: 1280, height: 800 },
  })
  return { context, page: await context.newPage() }
}

test.describe('Shell de aplicación (F2)', () => {
  test('ATHLETE ve el encabezado por ruta y el chip del plan vigente', async ({ browser }) => {
    const { context, page } = await athleteContext(browser)
    try {
      await page.goto('/classes')

      await expect(page.getByRole('banner')).toContainText(
        'Atleta · Explorar y reservar clases',
      )
      await expect(page.getByText('BOX', { exact: true }).first()).toBeVisible()
      await expect(page.getByTestId('membership-chip')).toHaveText(activePlan)
      await expect(
        page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', {
          name: 'Explorar clases',
        }),
      ).toHaveAttribute('aria-current', 'page')

      await page.getByRole('link', { name: 'Mis reservas' }).click()
      await expect(page).toHaveURL(new URL('/bookings', BASE).href)
      await expect(page.getByRole('banner')).toContainText('Atleta · Mis reservas')
    } finally {
      await context.close()
    }
  })

  test('ADMIN ve los cinco enlaces y Panel general abre F3 en /', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/admin')

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    const adminLinks = [
      { label: 'Panel general', href: '/' },
      { label: 'Agenda turnos', href: '/admin/schedule' },
      { label: 'Usuarios', href: '/admin/users' },
      { label: 'Membresías y pagos', href: '/admin/memberships' },
      { label: 'Administración', href: '/admin' },
    ]
    for (const { label, href } of adminLinks) {
      const link = nav.getByRole('link', { name: label, exact: true })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('href', href)
    }
    await expect(page.getByRole('banner')).toContainText('Administrador · Administración')

    await nav.getByRole('link', { name: 'Panel general', exact: true }).click()
    await expect(page).toHaveURL(new URL('/', BASE).href)
    await expect(page.getByRole('banner')).toContainText('Administrador · Panel general')
    // El shell compone el título; el panel de F3 se renderiza una sola vez.
    await expect(
      page.locator('main').getByRole('heading', { name: 'Panel general administrativo' }),
    ).toHaveCount(1)
    await expect(nav.getByRole('link', { name: 'Panel general', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('móvil: el drawer abre y cierra con aria-expanded / aria-controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const toggle = page.locator('header button[aria-controls="app-sidebar"]')
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('#app-sidebar')).toHaveCount(1)

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('#app-sidebar')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await toggle.click()
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Usuarios' })
      .click()
    await expect(page).toHaveURL(new URL('/admin/users', BASE).href)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  test('logout elimina la cookie de sesión y vuelve a /login', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    await page.getByRole('button', { name: 'Opciones de usuario' }).click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

    await expect(page).toHaveURL(new URL('/login', BASE).href)
    await expect
      .poll(async () =>
        (await page.context().cookies()).some((cookie) => cookie.name === COOKIE),
      )
      .toBe(false)
  })

  test('sin desbordamiento horizontal a 390 / 768 / 1440 px', async ({ page }) => {
    await page.goto('/')

    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await expect(page.getByRole('banner')).toBeVisible()
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth - clientWidth, `desbordamiento horizontal a ${width} px`).toBeLessThanOrEqual(
        1,
      )
    }
  })

  test('el chip de rol cumple contraste AA', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/admin')

    const header = page.getByRole('banner')
    await expect(header).toContainText('Administrador')

    const results = await new AxeBuilder({ page })
      .include('header')
      .withRules(['color-contrast'])
      .analyze()
    expect(
      results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((n) => n.html).join(', ')}`),
    ).toEqual([])
  })
})
