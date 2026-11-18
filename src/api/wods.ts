import { apiRequest } from '@/api/client'
import type { Meta, Wod } from '@/types/api'

export type GetWodsParams = {
  from?: string
  to?: string
  coach_id?: string
  page?: number
  limit?: number
}

function normalizeList(value: unknown): Wod[] {
  if (Array.isArray(value)) return value as Wod[]
  if (value && typeof value === 'object') return [value as Wod]
  return []
}

export async function getWods(
  token: string,
  params: GetWodsParams = {},
): Promise<{ wods: Wod[]; meta?: Meta }> {
  const result = await apiRequest<Wod[] | Wod>('/wods', { token, query: params })
  return { wods: normalizeList(result.data), meta: result.meta }
}

export async function getWodById(token: string, wodId: string): Promise<Wod> {
  const { data } = await apiRequest<Wod>(`/wods/${wodId}`, { token })
  return data
}
