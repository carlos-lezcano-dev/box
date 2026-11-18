import { apiRequest } from '@/api/client'
import type { CancelWodResult, Role, Wod } from '@/types/api'

export type ListWodsParams = {
  from?: string
  to?: string
  coach_id?: string
  page?: number
  limit?: number
}

export type CreateWodPayload = {
  title: string
  description?: string
  start_time: string
  end_time: string
  max_capacity?: number
  coach_id?: string
}

export type UpdateWodPayload = Partial<Omit<CreateWodPayload, 'coach_id'>> & {
  coach_id?: string | null
}

export async function getWods(token: string, params: ListWodsParams = {}) {
  const result = await apiRequest<Wod[]>('/wods', { token, query: params })
  return { wods: result.data, meta: result.meta }
}

export async function getWodById(token: string, wodId: string) {
  const { data } = await apiRequest<Wod>(`/wods/${wodId}`, { token })
  return data
}

export async function createWod(token: string, payload: CreateWodPayload) {
  const { data } = await apiRequest<Wod>('/wods', {
    method: 'POST',
    token,
    body: payload,
  })
  return data
}

export async function updateWod(token: string, wodId: string, payload: UpdateWodPayload) {
  const { data } = await apiRequest<Wod>(`/wods/${wodId}`, {
    method: 'PATCH',
    token,
    body: payload,
  })
  return data
}

export async function cancelWod(token: string, wodId: string) {
  const { data } = await apiRequest<CancelWodResult>(`/wods/${wodId}`, {
    method: 'DELETE',
    token,
  })
  return data
}

export async function listCoaches(token: string): Promise<Map<string, string>> {
  const [coaches, admins] = await Promise.all([
    apiRequest<Array<{ user_id: string; full_name: string }>>('/users', {
      token,
      query: { role: 'COACH' as Role, is_active: true, limit: 100 },
    }),
    apiRequest<Array<{ user_id: string; full_name: string }>>('/users', {
      token,
      query: { role: 'ADMIN' as Role, is_active: true, limit: 100 },
    }),
  ])
  const names = new Map<string, string>()
  ;[...coaches.data, ...admins.data].forEach((user) => {
    names.set(user.user_id, user.full_name)
  })
  return names
}
