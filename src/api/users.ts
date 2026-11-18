import { apiRequest } from '@/api/client'
import type { CurrentUser } from '@/types/api'

export async function getMe(token: string): Promise<CurrentUser> {
  const { data } = await apiRequest<CurrentUser>('/users/me', { token })
  return data
}
