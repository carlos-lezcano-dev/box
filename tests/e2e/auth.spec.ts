import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const BASE_URL = process.env.BOX_BASE_URL ?? 'http://localhost:3001'
const ADMIN_EMAIL = process.env.BOX_E2E_ADMIN_EMAIL ?? 'admin@box-core.test'
const PASSWORD = process.env.BOX_E2E_ADMIN_PASSWORD ?? 'TestPassw0rd!'
const EMPTY_STATE = { cookies: [], origins: [] }

type SessionState = {
  cookies: Array<{ name: string; value: string; httpOnly?: boolean }>
  origins: unknown[]
}

/** El globalSetup ya hizo login real con ADMIN; reutilizamos esa sesión. */
async function storedAdminSession(): Promise<SessionState> {
  const raw = await readFile('tests/e2e/storage.json', 'utf8')
  return JSON.parse(raw) as SessionState
}

function tokenFrom(state: SessionState): string {
  const token = state.cookies.find((cookie) => cookie.name === 'box_session')?.value
  expect(token, 'globalSetup debe dejar la sesión ADMIN en storage.json').toBeTruthy()
  return token ?? ''
}

function waitForSessionCleanup(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/logout') &&
      response.request().method() === 'POST',
  )
}

/** Espera a que la limpieza de sesión del paso 2 termine antes de hacer login. */
async function openLogin(page: Page, path = '/login') {
  const cleanup = waitForSessionCleanup(page)
  await page.goto(path)
  await cleanup
}

async function fillAndSubmit(page: Page) {
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

async function mockLoginError(page: Page, code: string, status: number, retryAfter?: string) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      headers: retryAfter ? { 'Retry-After': retryAfter } : undefined,
      body: JSON.stringify({
        success: false,
        error: { code },
        request_id: `e2e-${code.toLowerCase()}`,
      }),
    }),
  )
}

test.describe('F1 · Autenticación (visitante)', () => {
  test.use({ storageState: EMPTY_STATE })

  test('login válido: cookie httpOnly y redirect a /', async ({ page }) => {
    await openLogin(page)
    await fillAndSubmit(page)

    await expect(page).toHaveURL(new URL('/', BASE_URL).toString())
    const session = (await page.context().cookies()).find(
      (cookie) => cookie.name === 'box_session',
    )
    expect(session, 'debe existir la cookie de sesión').toBeDefined()
    expect(session?.httpOnly).toBe(true)
    expect(session?.value).toBeTruthy()
  })

  test('credenciales inválidas: permanece en /login y sin cookie', async ({ page }) => {
    await mockLoginError(page, 'AUTH_INVALID_CREDENTIALS', 401)
    await openLogin(page)
    await fillAndSubmit(page)

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('form').getByRole('alert')).toContainText('Email o contraseña incorrectos.')
    expect(
      (await page.context().cookies()).some((cookie) => cookie.name === 'box_session'),
    ).toBe(false)
  })

  test('usuario inactivo: mensaje específico y sin redirect', async ({ page }) => {
    await mockLoginError(page, 'AUTH_USER_INACTIVE', 403)
    await openLogin(page)
    await fillAndSubmit(page)

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('form').getByRole('alert')).toContainText('Tu cuenta está inactiva.')
    expect(
      (await page.context().cookies()).some((cookie) => cookie.name === 'box_session'),
    ).toBe(false)
  })

  test('429 muestra los segundos de Retry-After', async ({ page }) => {
    await mockLoginError(page, 'RATE_LIMITED', 429, '7')
    await openLogin(page)
    await fillAndSubmit(page)

    await expect(page.locator('form').getByRole('alert')).toContainText('Reintentá en 7 s.')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('/bookings sin sesión redirige a /login?next=/bookings', async ({ page }) => {
    await page.goto('/bookings')

    await expect(page).toHaveURL(/\/login\?next=/)
    expect(new URL(page.url()).searchParams.get('next')).toBe('/bookings')
  })

  test('login con next vuelve a /bookings', async ({ page }) => {
    // La respuesta se simula con el token real de storage.json: no hay un
    // segundo login contra el backend y la página autenticada se renderiza.
    const token = tokenFrom(await storedAdminSession())
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Cache-Control': 'no-store',
          'set-cookie': `box_session=${token}; Path=/; HttpOnly; SameSite=Lax`,
        },
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              user_id: 'e2e-admin',
              email: ADMIN_EMAIL,
              full_name: 'Admin E2E',
              role: 'ADMIN',
            },
          },
        }),
      }),
    )

    await openLogin(page, '/login?next=/bookings')
    await fillAndSubmit(page)

    await expect(page).toHaveURL(new URL('/bookings', BASE_URL).toString())
  })

  test('cookie inválida en /admin: redirect a /login y cookie eliminada', async ({ page }) => {
    await page.context().addCookies([
      { name: 'box_session', value: 'token-invalido-e2e', url: BASE_URL, httpOnly: true },
    ])
    const cleanup = waitForSessionCleanup(page)

    await page.goto('/admin')

    await expect(page).toHaveURL(new URL('/login', BASE_URL).toString())
    await cleanup
    await expect
      .poll(async () =>
        (await page.context().cookies()).some((cookie) => cookie.name === 'box_session'),
      )
      .toBe(false)
  })
})

test.describe('F1 · Autenticación (sesión ADMIN)', () => {
  test('cerrar sesión elimina la cookie y vuelve a /login', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('banner')).toBeVisible()

    await page.getByRole('banner').locator('button[aria-haspopup="menu"]').click()
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click()

    await expect(page).toHaveURL(new URL('/login', BASE_URL).toString())
    await expect
      .poll(async () =>
        (await page.context().cookies()).some((cookie) => cookie.name === 'box_session'),
      )
      .toBe(false)
  })

  test('el JWT leído de la cookie no aparece en el HTML ni en logs de consola', async ({
    page,
  }) => {
    const token = tokenFrom(await storedAdminSession())
    const payload = token.split('.')[1]
    expect(payload, 'el JWT debe tener payload').toBeTruthy()

    const consoleLines: string[] = []
    page.on('console', (message) => consoleLines.push(message.text()))

    for (const path of ['/', '/admin']) {
      await page.goto(path)
      await expect(page.getByRole('banner')).toBeVisible()

      const html = await page.content()
      const logs = consoleLines.join('\n')
      expect(html).not.toContain(token)
      expect(html).not.toContain(payload ?? '')
      expect(logs).not.toContain(token)
      expect(logs).not.toContain(payload ?? '')
    }
  })
})
