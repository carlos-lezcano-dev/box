import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

const BASE_URL = process.env.BOX_BASE_URL ?? 'http://localhost:3001'
type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>

async function loginState(email: string): Promise<StorageState> {
  const file = email === 'coach@box-core.test' ? 'coach-storage.json' : 'athlete-storage.json'
  const state = JSON.parse(await readFile(`tests/e2e/${file}`, 'utf8')) as StorageState
  // Los tests corren sobre http://localhost; las cookies Secure no se enviarían.
  return {
    ...state,
    cookies: state.cookies.map((cookie) => ({ ...cookie, secure: false })),
  }
}

test.describe('Panel general (F3)', () => {
  test('ADMIN ve el encabezado, los contadores y los próximos turnos', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'Panel general administrativo' }),
    ).toBeVisible()
    await expect(page.getByText('BOX', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Todo listo para un día más fuerte.')).toBeVisible()

    const athletes = page.getByTestId('athletes-card')
    await expect(athletes).toContainText('Atletas')
    await expect(athletes).toContainText(/\d+/)

    const memberships = page.getByTestId('memberships-card')
    await expect(memberships).toContainText('Membresías')
    await expect(memberships).toContainText(/\d+/)

    await expect(page.getByTestId('next-wods-card')).toBeVisible()
    // Las métricas sin fuente confirmada no se renderizan.
    await expect(page.getByTestId('collected-amount-card')).toHaveCount(0)
    await expect(page.getByText('86', { exact: true })).toHaveCount(0)
  })

  for (const email of ['atleta@box-core.test', 'coach@box-core.test']) {
    test(`${email} es redirigido a /classes`, async ({ browser }) => {
      const storageState = await loginState(email)
      const context = await browser.newContext({ baseURL: BASE_URL, storageState })
      try {
        const page = await context.newPage()
        await page.goto('/')
        await expect(page).toHaveURL(/\/classes\?from=\d{4}-\d{2}-\d{2}/)
        await expect(
          page.getByRole('heading', { name: 'Panel general administrativo' }),
        ).toHaveCount(0)
      } finally {
        await context.close()
      }
    })
  }

  test('un fallo simulado de /memberships no rompe el resto del panel', async ({ page }) => {
    await page.route('**/api/v1/memberships*', (route) => route.abort())

    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: 'Panel general administrativo' }),
    ).toBeVisible()
    await expect(page.getByTestId('athletes-card')).toContainText('Atletas')
    await expect(page.getByTestId('next-wods-card')).toBeVisible()
    // Ningún error global tapa al panel: la degradación es local por tarjeta.
    await expect(page.getByText('No pudimos cargar tu espacio')).toHaveCount(0)
  })
})
