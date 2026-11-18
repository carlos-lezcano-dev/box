import { writeFile } from 'node:fs/promises'
import { request } from '@playwright/test'

const BASE_URL = process.env.BOX_BASE_URL ?? 'http://localhost:3001'
const PASSWORD = process.env.BOX_E2E_ADMIN_PASSWORD ?? 'TestPassw0rd!'

type SessionFile = {
  file: string
  email: string
}

/** Una sola autenticación real por usuario; el resto de los specs reutiliza la cookie. */
const SESSIONS: SessionFile[] = [
  { file: 'storage.json', email: process.env.BOX_E2E_ADMIN_EMAIL ?? 'admin@box-core.test' },
  { file: 'athlete-storage.json', email: 'atleta@box-core.test' },
  { file: 'coach-storage.json', email: 'coach@box-core.test' },
  { file: 'filler-storage.json', email: 'e2e-f6-filler@box-core.test' },
  { file: 'no-membership-storage.json', email: 'e2e-f6-no-membership@box-core.test' },
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function login(context: Awaited<ReturnType<typeof request.newContext>>, email: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await context.post('/api/auth/login', {
      data: { email, password: PASSWORD },
    })
    if (response.ok()) return

    const retryAfter = Number(response.headers()['retry-after'] ?? 5)
    if (response.status() === 429 && attempt < 3) {
      await delay(Math.min(Math.max(retryAfter, 1), 30) * 1000)
      continue
    }
    throw new Error(`No se pudo autenticar ${email} para E2E: ${response.status()}`)
  }
  throw new Error(`No se pudo autenticar ${email} para E2E`)
}

export default async function globalSetup() {
  for (const { file, email } of SESSIONS) {
    const context = await request.newContext({ baseURL: BASE_URL })
    try {
      await login(context, email)
      const state = await context.storageState()
      // Los tests corren por http://localhost: una cookie Secure no se enviaría.
      await writeFile(
        `tests/e2e/${file}`,
        JSON.stringify({
          ...state,
          cookies: state.cookies.map((cookie) => ({ ...cookie, secure: false })),
        }),
      )
    } finally {
      await context.dispose()
    }
  }
}
