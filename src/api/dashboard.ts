import { listUsers } from '@/api/admin-users'
import { getMemberships } from '@/api/memberships'
import { getWods } from '@/api/wods'
import { getBoxToday, toUtcIso } from '@/lib/datetime'
import type { Wod } from '@/types/api'

export type SettledCount =
  | { ok: true; total: number }
  | { ok: false; code: string; message: string }

export type SettledWods =
  | { ok: true; wods: Wod[] }
  | { ok: false; code: string; message: string }

export type PanelMetrics = {
  athletes: SettledCount
  memberships: SettledCount
  wods: SettledWods
}

function failure(error: unknown): { code: string; message: string } {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code)
    const message =
      'message' in error && typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : code
    return { code, message }
  }
  return { code: 'INTERNAL_ERROR', message: 'No se pudo cargar la métrica.' }
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day))
  value.setUTCDate(value.getUTCDate() + days)
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
}

/** Cada bloque se degrada por separado: un fallo no tapa el resto del panel. */
export async function getPanelMetrics(token: string): Promise<PanelMetrics> {
  const today = getBoxToday()
  const [athletes, memberships, wods] = await Promise.allSettled([
    listUsers(token, { role: 'ATHLETE', limit: 1 }),
    getMemberships(token, { limit: 1 }),
    getWods(token, {
      from: toUtcIso(today, '00:00'),
      to: toUtcIso(addDays(today, 7), '00:00'),
      limit: 5,
    }),
  ])

  return {
    athletes:
      athletes.status === 'fulfilled'
        ? { ok: true, total: athletes.value.meta?.total ?? 0 }
        : { ok: false, ...failure(athletes.reason) },
    memberships:
      memberships.status === 'fulfilled'
        ? { ok: true, total: memberships.value.meta?.total ?? 0 }
        : { ok: false, ...failure(memberships.reason) },
    wods:
      wods.status === 'fulfilled'
        ? { ok: true, wods: wods.value.wods }
        : { ok: false, ...failure(wods.reason) },
  }
}
