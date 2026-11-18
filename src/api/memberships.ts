import { apiRequest } from '@/api/client'
import type {
  Membership,
  MembershipStatus,
  Meta,
  PaymentMethod,
} from '@/types/api'

export type ListMembershipsParams = {
  status?: MembershipStatus
  from?: string
  to?: string
  page?: number
  limit?: number
}

function normalizeList(value: unknown): Membership[] {
  if (Array.isArray(value)) return value as Membership[]
  if (value && typeof value === 'object') return [value as Membership]
  return []
}

export async function getMyMemberships(
  token: string,
): Promise<{ memberships: Membership[]; meta?: Meta }> {
  const result = await apiRequest<Membership[] | Membership>('/memberships/me', {
    token,
  })
  return { memberships: normalizeList(result.data), meta: result.meta }
}

export async function getMemberships(
  token: string,
  params: ListMembershipsParams = {},
): Promise<{ memberships: Membership[]; meta?: Meta }> {
  const result = await apiRequest<Membership[] | Membership>('/memberships', {
    token,
    query: params,
  })
  return { memberships: normalizeList(result.data), meta: result.meta }
}

export type CreateMembershipPayload = {
  user_id: string
  plan_name: string
  amount_paid: number
  start_date: string
  end_date: string
  payment_method: PaymentMethod
  notes?: string
}

export async function createMembership(
  token: string,
  payload: CreateMembershipPayload,
  idempotencyKey: string,
): Promise<Membership> {
  const { data } = await apiRequest<Membership>('/memberships', {
    method: 'POST',
    token,
    body: payload,
    idempotencyKey,
  })
  return data
}
