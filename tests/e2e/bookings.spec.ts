import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { expect, request, test, type Page } from '@playwright/test'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
const BASE_URL = process.env.BOX_BASE_URL ?? 'http://localhost:3001'
const ATHLETE_EMAIL = 'atleta@box-core.test'
const ADMIN_EMAIL = 'admin@box-core.test'
const PASSWORD = 'TestPassw0rd!'
const PROMOTED_NOTICE = 'Se promovió a la siguiente persona de la lista de espera'

type ApiContext = Awaited<ReturnType<typeof request.newContext>>
const tokenCache = new Map<string, string>()

async function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

// `baseURL` con /api/v1 más una ruta absoluta caería en el root del backend.
function url(path: string): string {
  return `${API_URL}${path}`
}

async function storedToken(email: string): Promise<string> {
  const file = email === ATHLETE_EMAIL ? 'athlete-storage.json' : 'storage.json'
  const state = JSON.parse(await readFile(`tests/e2e/${file}`, 'utf8')) as {
    cookies?: Array<{ name: string; value: string }>
  }
  const token = state.cookies?.find((cookie) => cookie.name === 'box_session')?.value
  expect(token, `Falta la sesión E2E de ${email}`).toBeTruthy()
  return token ?? ''
}

async function loginApi(api: ApiContext, email: string): Promise<string> {
  const cached = tokenCache.get(email)
  if (cached) return cached
  if (email === ATHLETE_EMAIL) {
    const token = await storedToken(email)
    tokenCache.set(email, token)
    return token
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await api.post(url('/auth/login'), {
      data: { email, password: PASSWORD },
    })
    if (response.ok()) {
      const payload = await response.json()
      const token = payload.data.access_token as string
      tokenCache.set(email, token)
      return token
    }

    const payload = await response.json().catch(() => ({}))
    if (payload.error?.code === 'RATE_LIMITED' && attempt < 2) {
      const seconds = Number(response.headers()['retry-after'] ?? 10) || 10
      await new Promise((resolve) => setTimeout(resolve, Math.min(seconds, 25) * 1000))
      continue
    }
    expect(response.ok(), `login API falló para ${email}`).toBeTruthy()
  }
  throw new Error(`No se pudo autenticar a ${email}`)
}

/** El global setup ya dejó la sesión ADMIN en storage.json: la reutilizamos. */
async function getAdminToken(api: ApiContext): Promise<string> {
  try {
    const state = JSON.parse(await readFile('tests/e2e/storage.json', 'utf8')) as {
      cookies?: Array<{ name: string; value: string }>
    }
    const cookie = state.cookies?.find((item) => item.name === 'box_session')
    if (cookie?.value) return cookie.value
  } catch {
    // Si no hay storage, caemos al login por API.
  }
  return loginApi(api, ADMIN_EMAIL)
}

async function registerAthlete(api: ApiContext, email: string): Promise<string> {
  const response = await api.post(url('/users/register'), {
    data: { email, password: PASSWORD, full_name: 'Atleta E2E reservas' },
  })
  if (response.ok()) {
    const payload = await response.json()
    return payload.data.user_id as string
  }

  const payload = await response.json()
  expect(payload.error?.code).toBe('USER_EMAIL_TAKEN')
  const token = await loginApi(api, email)
  const me = await api.get(url('/users/me'), { headers: await authHeaders(token) })
  const mePayload = await me.json()
  return mePayload.data.user_id as string
}

async function createWod(
  api: ApiContext,
  adminToken: string,
  title: string,
  maxCapacity: number,
): Promise<string> {
  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const response = await api.post(url('/wods'), {
    headers: await authHeaders(adminToken),
    data: {
      title,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      max_capacity: maxCapacity,
    },
  })
  expect(response.ok(), `crear WOD falló: ${await response.text()}`).toBeTruthy()
  const payload = await response.json()
  return payload.data.wod_id as string
}

async function book(
  api: ApiContext,
  token: string,
  wodId: string,
  userId?: string,
): Promise<string> {
  const response = await api.post(url('/bookings'), {
    headers: { ...(await authHeaders(token)), 'Idempotency-Key': randomUUID() },
    data: userId ? { wod_id: wodId, user_id: userId } : { wod_id: wodId },
  })
  expect(response.ok(), `reservar falló: ${await response.text()}`).toBeTruthy()
  const payload = await response.json()
  return payload.data.booking_id as string
}

type Fixture = {
  api: ApiContext
  adminToken: string
  athleteToken: string
  wodId: string
  bookingId: string
  title: string
  cleanup: () => Promise<void>
}

async function createFixture(titlePrefix: string, maxCapacity: number): Promise<Fixture> {
  const api = await request.newContext({ baseURL: API_URL })
  const adminToken = await getAdminToken(api)
  const athleteToken = await loginApi(api, ATHLETE_EMAIL)
  const title = `${titlePrefix} ${randomUUID().slice(0, 8)}`
  const wodId = await createWod(api, adminToken, title, maxCapacity)
  const bookingId = await book(api, athleteToken, wodId)

  return {
    api,
    adminToken,
    athleteToken,
    wodId,
    bookingId,
    title,
    cleanup: async () => {
      await api.delete(url(`/wods/${wodId}`), { headers: await authHeaders(adminToken) })
      await api.dispose()
    },
  }
}

test.describe('F5 · Mis reservas', () => {
  // Los tests de atleta no usan el storageState ADMIN por defecto.
  test.use({ storageState: { cookies: [], origins: [] } })
  test.setTimeout(90_000)

  /** Reutiliza la cookie sembrada en globalSetup en lugar de hacer login por test. */
  async function loginAsAthlete(page: Page, token?: string) {
    const value = token ?? (await storedToken(ATHLETE_EMAIL))
    await page.context().addCookies([
      { name: 'box_session', value, url: BASE_URL, httpOnly: true },
    ])
  }

  test('muestra el encabezado, el subtítulo y las reservas agrupadas', async ({ page }) => {
    const fixture = await createFixture('F5 reserva', 4)
    try {
      await loginAsAthlete(page)
      await page.goto('/bookings')

      await expect(page.getByRole('heading', { level: 1, name: 'Mis reservas' })).toBeVisible()
      await expect(page.getByText('Tu entrenamiento, organizado.')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Reservas confirmadas' })).toBeVisible()

      const item = page.getByTestId('booking-item').filter({ hasText: fixture.title })
      await expect(item).toBeVisible()
      await expect(item.getByTestId('booking-status-badge')).toHaveText('Confirmada')
    } finally {
      await fixture.cleanup()
    }
  })

  test('cancelar con promoted: true muestra el aviso y quita la reserva', async ({ page }) => {
    const fixture = await createFixture('F5 promoción', 1)
    try {
      // Segundo atleta con membresía: su reserva entra en waitlist y es promovida.
      const waiterEmail = `e2e-f5-espera-${randomUUID().slice(0, 8)}@box-core.test`
      const waiterId = await registerAthlete(fixture.api, waiterEmail)
      const today = new Date().toISOString().slice(0, 10)
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const membership = await fixture.api.post(url('/memberships'), {
        headers: {
          ...(await authHeaders(fixture.adminToken)),
          'Idempotency-Key': randomUUID(),
        },
        data: {
          user_id: waiterId,
          plan_name: 'Libre mensual',
          amount_paid: 1000,
          start_date: today,
          end_date: endDate,
          payment_method: 'CASH',
        },
      })
      expect(membership.ok(), `crear membresía falló: ${await membership.text()}`).toBeTruthy()
      // Un ADMIN puede reservar en nombre de otro atleta sin loguearse como él.
      await book(fixture.api, fixture.adminToken, fixture.wodId, waiterId)

      await loginAsAthlete(page)
      await page.goto('/bookings')

      const item = page.getByTestId('booking-item').filter({ hasText: fixture.title })
      await expect(item).toBeVisible()
      await item.getByRole('button', { name: 'Cancelar reserva' }).click()

      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: '¿Cancelar tu reserva?' })).toBeVisible()
      await expect(dialog).toContainText(fixture.title)
      await dialog.getByRole('button', { name: 'Confirmar cancelación' }).click()

      await expect(page.getByTestId('booking-notice')).toHaveText(PROMOTED_NOTICE)
      await expect(item).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })

  test('BOOKING_ALREADY_CANCELLED recarga la lista y avisa', async ({ page }) => {
    const fixture = await createFixture('F5 cancelada', 4)
    try {
      await loginAsAthlete(page)
      await page.goto('/bookings')

      const item = page.getByTestId('booking-item').filter({ hasText: fixture.title })
      await expect(item).toBeVisible()

      // Cancelamos por API con la UI ya cargada: el siguiente confirm recibe el 409.
      const cancelled = await fixture.api.delete(url(`/bookings/${fixture.bookingId}`), {
        headers: await authHeaders(fixture.athleteToken),
      })
      expect(cancelled.ok()).toBeTruthy()

      await item.getByRole('button', { name: 'Cancelar reserva' }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cancelación' }).click()

      await expect(page.getByText('Ya estaba cancelada.')).toBeVisible()
      await expect(item).toHaveCount(0)
    } finally {
      await fixture.cleanup()
    }
  })

  test('el estado vacío ofrece el CTA a /classes', async ({ page }) => {
    const api = await request.newContext({ baseURL: API_URL })
    const email = `e2e-f5-vacio-${randomUUID().slice(0, 8)}@box-core.test`
    try {
      await registerAthlete(api, email)
      await loginAsAthlete(page, await loginApi(api, email))
      await page.goto('/bookings')

      await expect(page.getByTestId('bookings-empty-state')).toBeVisible()
      await expect(
        page.getByTestId('bookings-empty-state').getByRole('link', { name: 'Explorar clases' }),
      ).toHaveAttribute('href', '/classes')
    } finally {
      await api.dispose()
    }
  })
})
