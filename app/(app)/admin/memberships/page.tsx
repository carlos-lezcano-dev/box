import { Suspense } from 'react'
import type { Metadata } from 'next'
import { io } from 'next/cache'
import { redirect } from 'next/navigation'
import { ApiError } from '@/api/client'
import { listUsers } from '@/api/admin-users'
import { listMemberships, type ListMembershipsParams } from '@/api/admin-memberships'
import { AdminMembershipMetrics } from '@/components/features/admin/admin-membership-metrics'
import { AdminMembershipTable } from '@/components/features/admin/admin-membership-table'
import { RegisterPaymentTrigger } from '@/components/features/admin/register-payment-trigger'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState, ErrorPanel } from '@/components/ui/state-panels'
import { getErrorMessage } from '@/lib/errors'
import { getToken } from '@/lib/session'
import type { MembershipStatus } from '@/types/api'

export const metadata: Metadata = {
  title: 'Membresías y pagos · BOX',
}

type Search = {
  page?: string | string[]
  user_id?: string | string[]
  status?: string | string[]
  from?: string | string[]
  to?: string | string[]
  sort?: string | string[]
  order?: string | string[]
}

type MembershipSort = NonNullable<ListMembershipsParams['sort']>
type MembershipOrder = NonNullable<ListMembershipsParams['order']>

type MembershipsData = {
  list: Awaited<ReturnType<typeof listMemberships>>
  users: Awaited<ReturnType<typeof listUsers>>
}

type LoadResult = { ok: true; data: MembershipsData } | { ok: false; error: ApiError }

const single = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value)

function normalizeStatus(value?: string): MembershipStatus | undefined {
  return value === 'ACTIVE' || value === 'EXPIRED' || value === 'FROZEN' || value === 'CANCELLED'
    ? value
    : undefined
}

function normalizeSort(value?: string): MembershipSort {
  return value === 'end_date' || value === 'amount_paid' ? value : 'created_at'
}

function normalizeOrder(value?: string): MembershipOrder {
  return value === 'asc' ? 'asc' : 'desc'
}

async function loadMemberships(
  token: string,
  page: number,
  params: Omit<ListMembershipsParams, 'page' | 'limit'>,
): Promise<LoadResult> {
  try {
    const [list, users] = await Promise.all([
      listMemberships(token, { ...params, page, limit: 20 }),
      listUsers(token, { limit: 100 }),
    ])
    return { ok: true, data: { list, users } }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error }
    throw error
  }
}

export default function AdminMembershipsPage({
  searchParams,
}: PageProps<'/admin/memberships'>) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
      <MembershipsSection searchParams={searchParams} />
    </Suspense>
  )
}

async function MembershipsSection({ searchParams }: { searchParams: Promise<Search> }) {
  await io()
  const params = await searchParams
  const page = Math.max(1, Number(single(params.page) ?? '1') || 1)
  const filters: Omit<ListMembershipsParams, 'page' | 'limit'> = {
    user_id: single(params.user_id) || undefined,
    status: normalizeStatus(single(params.status)),
    from: single(params.from) || undefined,
    to: single(params.to) || undefined,
    sort: normalizeSort(single(params.sort)),
    order: normalizeOrder(single(params.order)),
  }
  const query: Record<string, string | undefined> = {
    user_id: filters.user_id,
    status: filters.status,
    from: filters.from,
    to: filters.to,
    sort: filters.sort,
    order: filters.order,
  }

  const token = await getToken()
  if (!token) redirect('/login')

  const result = await loadMemberships(token, page, filters)
  if (!result.ok) {
    return (
      <ErrorPanel
        code={result.error.code}
        message={getErrorMessage(result.error.code, result.error.message)}
        requestId={result.error.requestId}
      />
    )
  }

  const { list, users } = result.data

  return (
    <div>
      <PageHeader
        eyebrow="BOX · Membresías"
        title="Membresías y pagos mensuales"
        subtitle="Vigencias claras. Cuentas al día."
        actions={
          <RegisterPaymentTrigger
            users={users.users.map((user) => ({
              user_id: user.user_id,
              full_name: user.full_name,
              email: user.email,
            }))}
          />
        }
      />

      <AdminMembershipMetrics />

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <select
          name="user_id"
          defaultValue={filters.user_id ?? ''}
          aria-label="Atleta"
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Todos los atletas</option>
          {filters.user_id &&
            !users.users.some((user) => user.user_id === filters.user_id) && (
              <option value={filters.user_id}>{filters.user_id.slice(0, 8)}…</option>
            )}
          {users.users.map((user) => (
            <option key={user.user_id} value={user.user_id}>
              {user.full_name}
            </option>
          ))}
        </select>
        <select
          name="status"
          aria-label="Filtrar por estado"
          defaultValue={filters.status ?? ''}
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activa</option>
          <option value="FROZEN">Congelada</option>
          <option value="EXPIRED">Vencida</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
        <input
          type="date"
          name="from"
          defaultValue={filters.from}
          aria-label="Desde"
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={filters.to}
          aria-label="Hasta"
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        />
        <select
          name="sort"
          defaultValue={filters.sort}
          aria-label="Ordenar por"
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="created_at">Fecha de alta</option>
          <option value="end_date">Vencimiento</option>
          <option value="amount_paid">Importe</option>
        </select>
        <select
          name="order"
          defaultValue={filters.order}
          aria-label="Dirección del orden"
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="desc">Descendente</option>
          <option value="asc">Ascendente</option>
        </select>
        <button type="submit" className="rounded-lg border px-4 py-2.5 text-sm">
          Filtrar
        </button>
      </form>

      <div className="mt-6">
        {list.memberships.length === 0 ? (
          <EmptyState
            title="No hay membresías para este filtro"
            description="Registrá un pago o cambiá los filtros de vigencia."
          />
        ) : (
          <AdminMembershipTable
            memberships={list.memberships}
            meta={list.meta}
            query={query}
          />
        )}
      </div>
    </div>
  )
}
