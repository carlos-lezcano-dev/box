import { apiRequest } from '@/api/client'
import type {
  Membership,
  MembershipStatus,
  PaymentMethod,
} from '@/types/api'

export type ListMembershipsParams = {
  user_id?: string
  status?: MembershipStatus
  from?: string
  to?: string
  page?: number
  limit?: number
  sort?: 'created_at' | 'end_date' | 'amount_paid'
  order?: 'asc' | 'desc'
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

export async function listMemberships(
  token: string,
  params: ListMembershipsParams = {},
) {
  const result = await apiRequest<Membership[]>('/memberships', { token, query: params })
  return { memberships: result.data, meta: result.meta }
}

export async function createMembership(
  token: string,
  payload: CreateMembershipPayload,
  idempotencyKey: string,
) {
  const { data } = await apiRequest<Membership>('/memberships', {
    method: 'POST',
    token,
    body: payload,
    idempotencyKey,
  })
  return data
}

export async function updateMembershipStatus(
  token: string,
  membershipId: string,
  status: Extract<MembershipStatus, 'ACTIVE' | 'FROZEN' | 'CANCELLED'>,
) {
  const { data } = await apiRequest<Membership>(
    `/memberships/${membershipId}/status`,
    { method: 'PATCH', token, body: { status } },
  )
  return data
}
