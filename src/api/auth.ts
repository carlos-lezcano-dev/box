import { apiRequest } from '@/api/client'
import type { LoginRequest, LoginResponse } from '@/types/api'

export function login(body: LoginRequest) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body,
  })
}
