import { apiRequest } from '@/api/client'
import type { Role, UserItem } from '@/types/api'

export type ListUsersParams = {
  page?: number
  limit?: number
  role?: Role
  is_active?: boolean
  q?: string
  sort?: 'created_at' | 'full_name' | 'email'
  order?: 'asc' | 'desc'
}

export type RegisterUserPayload = {
  email: string
  password: string
  full_name: string
  phone?: string
  emergency_contact?: string
  role?: Role
}

export async function listUsers(token: string, params: ListUsersParams = {}) {
  const result = await apiRequest<UserItem[]>('/users', { token, query: params })
  return { users: result.data, meta: result.meta }
}

export async function getUserById(token: string, userId: string) {
  const { data } = await apiRequest<UserItem>(`/users/${userId}`, { token })
  return data
}

export async function registerUser(token: string, payload: RegisterUserPayload) {
  const { data } = await apiRequest<UserItem>('/users/register', {
    method: 'POST',
    token,
    body: payload,
  })
  return data
}
