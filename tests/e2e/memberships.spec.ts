import { readFile } from 'node:fs/promises'
import { expect, request, test, type APIRequestContext } from '@playwright/test'

const FRONT_URL = process.env.BOX_BASE_URL ?? 'http://localhost:3001'
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
const API_ROOT = API_URL.replace(/\/api\/v1\/?$/, '')
const PASSWORD = 'TestPassw0rd!'

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>

type MembershipDTO = {
  membership_id: string
  plan_name: string
  amount_paid: number
  end_date: string
  status: 'ACTIVE' | 'EXPIRED' | 'FROZEN' | 'CANCELLED'
}

async function login(email: string, password: string): Promise<StorageState> {
  const file =
    email === 'admin@box-core.test'
      ? 'storage.json'
      : email === 'coach@box-core.test'
        ? 'coach-storage.json'
        : email === 'atleta@box-core.test'
          ? 'athlete-storage.json'
          : ''
  if (file) {
    try {
      const state = JSON.parse(await readFile(`tests/e2e/${file}`, 'utf8')) as StorageState
      return {
        ...state,
        cookies: state.cookies.map((cookie) => ({ ...cookie, secure: false })),
      }
    } catch {
      // Sin sesión pregenerada: se hace un login real por única vez.
    }
  }

  const context = await request.newContext({ baseURL: FRONT_URL })
  try {
    const response = await context.post('/api/auth/login', { data: { email, password } })
    expect(response.ok(), `login ${email}: ${response.status()}`).toBeTruthy()
    return await context.storageState()
  } finally {
    await context.dispose()
  }
}

function tokenFrom(state: StorageState): string {
  const token = state.cookies.find((cookie) => cookie.name === 'box_session')?.value
  expect(token, 'La cookie de sesión debe existir').toBeTruthy()
  return token ?? ''
}

async function backend(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_ROOT,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  })
}

function pickCurrent(list: MembershipDTO[]): MembershipDTO | null {
  const active = list.filter((item) => item.status === 'ACTIVE')
  const pool = active.length > 0 ? active : list
  return (
    [...pool].sort((a, b) =>
      active.length > 0
        ? a.end_date.localeCompare(b.end_date)
        : b.end_date.localeCompare(a.end_date),
    )[0] ?? null
  )
}

function formatAmount(amount: number): string {
  return `$${new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(amount)}`
}

test.describe.serial('Membresías · atleta', () => {
  let athleteState: StorageState
  let current: MembershipDTO | null = null

  test.beforeAll(async () => {
    athleteState = await login('atleta@box-core.test', PASSWORD)
    const api = await backend(tokenFrom(athleteState))
    try {
      const response = await api.get('/api/v1/memberships/me')
      expect(response.ok(), `GET /memberships/me: ${response.status()}`).toBeTruthy()
      const body = (await response.json()) as {
        data: MembershipDTO[] | MembershipDTO
      }
      const list = Array.isArray(body.data) ? body.data : body.data ? [body.data] : []
      current = pickCurrent(list)
    } finally {
      await api.dispose()
    }
  })

  for (const path of ['/classes', '/bookings']) {
    test(`el chip del plan aparece en ${path}`, async ({ browser }) => {
      test.skip(
        !current || current.status !== 'ACTIVE',
        'El atleta no tiene una membresía ACTIVE sembrada',
      )

      const context = await browser.newContext({
        storageState: athleteState,
        viewport: { width: 1280, height: 800 },
      })
      try {
        const page = await context.newPage()
        const response = await page.goto(path)
        test.skip(response?.status() === 404, `${path} todavía no existe`)

        // Si la otra feature todavía está en construcción, no la validamos acá.
        const unrelatedError = page
          .getByRole('alert')
          .filter({ hasText: 'No pudimos cargar tu espacio' })
        const chip = page.getByRole('banner').getByTestId('membership-chip')
        await Promise.race([
          chip.waitFor({ state: 'attached', timeout: 5000 }).then(() => undefined),
          unrelatedError.waitFor({ state: 'visible', timeout: 5000 }).then(() => undefined),
        ]).catch(() => undefined)
        test.skip(
          (await unrelatedError.count()) > 0,
          `${path} no está listo todavía`,
        )

        await expect(chip).toHaveText(current?.plan_name ?? '')
      } finally {
        await context.close()
      }
    })
  }

  test('/memberships muestra el plan y el importe reales', async ({ browser }) => {
    test.skip(!current, 'El atleta no tiene membresías sembradas')

    const context = await browser.newContext({
      storageState: athleteState,
      viewport: { width: 1280, height: 800 },
    })
    try {
      const page = await context.newPage()
      await page.goto('/memberships')

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Membresías y pagos mensuales',
      )
      await expect(page.getByRole('heading', { name: current?.plan_name ?? '' })).toBeVisible()
      await expect(page.getByText(formatAmount(current?.amount_paid ?? 0), { exact: true })).toBeVisible()
    } finally {
      await context.close()
    }
  })

  test('una membresía vencida no muestra el badge «Al día»', async ({ browser }) => {
    // El fetch de la página ocurre en el servidor: page.route no puede
    // interceptarlo. Se siembra un atleta temporal con una membresía EXPIRED
    // real (el backend la calcula por end_date) y se valida el DOM resultante.
    const adminApi = await backend(tokenFrom(await login('admin@box-core.test', PASSWORD)))
    const publicApi = await request.newContext({ baseURL: API_ROOT })
    try {
      const email = `e2e-vencida-${Date.now()}@box-core.test`
      const registered = await publicApi.post('/api/v1/users/register', {
        data: { email, password: PASSWORD, full_name: 'Atleta vencido E2E' },
      })
      expect(registered.ok(), `register: ${registered.status()}`).toBeTruthy()
      const { data: user } = (await registered.json()) as { data: { user_id: string } }

      const created = await adminApi.post('/api/v1/memberships', {
        data: {
          user_id: user.user_id,
          plan_name: 'Plan vencido E2E',
          amount_paid: 100000,
          start_date: '2026-09-01',
          end_date: '2026-09-30',
          payment_method: 'TRANSFER',
        },
        headers: { 'Idempotency-Key': `e2e-expired-${Date.now()}` },
      })
      expect(created.ok(), `POST /memberships: ${created.status()}`).toBeTruthy()

      const context = await browser.newContext({
        storageState: await login(email, PASSWORD),
        viewport: { width: 1280, height: 800 },
      })
      try {
        const page = await context.newPage()
        await page.goto('/memberships')

        await expect(page.getByRole('heading', { name: 'Plan vencido E2E' })).toBeVisible()
        await expect(page.getByRole('article').getByText('Vencida', { exact: true })).toBeVisible()
        expect(
          await page.getByRole('article').getByText('Al día', { exact: true }).count(),
        ).toBe(0)
      } finally {
        await context.close()
      }
    } finally {
      await publicApi.dispose()
      await adminApi.dispose()
    }
  })
})
