import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { io } from 'next/cache'
import { redirect } from 'next/navigation'
import { ApiError } from '@/api/client'
import { listUsers } from '@/api/admin-users'
import { CreateUserTrigger } from '@/components/features/admin/create-user-trigger'
import { UserMetrics } from '@/components/features/admin/user-metrics'
import { UserTable } from '@/components/features/admin/user-table'
import { PageHeader } from '@/components/ui/page-header'
import { ErrorPanel, EmptyState } from '@/components/ui/state-panels'
import { getUserMetrics } from '@/lib/admin-view'
import { getErrorMessage } from '@/lib/errors'
import { getToken } from '@/lib/session'
import type { Role } from '@/types/api'

export const metadata: Metadata = {
  title: 'Gestión de usuarios · BOX',
}

type Search = {
  page?: string | string[]
  q?: string | string[]
  role?: string | string[]
}

type UsersData = {
  all: Awaited<ReturnType<typeof listUsers>>
  athletes: Awaited<ReturnType<typeof listUsers>>
  coaches: Awaited<ReturnType<typeof listUsers>>
  admins: Awaited<ReturnType<typeof listUsers>>
  list: Awaited<ReturnType<typeof listUsers>>
}

type LoadResult = { ok: true; data: UsersData } | { ok: false; error: ApiError }

const single = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value

function normalizeRole(value?: string): Role | undefined {
  return value === 'ATHLETE' || value === 'COACH' || value === 'ADMIN'
    ? value
    : undefined
}

async function loadUsers(
  token: string,
  page: number,
  q?: string,
  role?: Role,
): Promise<LoadResult> {
  try {
    const [all, athletes, coaches, admins, list] = await Promise.all([
      listUsers(token, { limit: 1 }),
      listUsers(token, { limit: 1, role: 'ATHLETE' }),
      listUsers(token, { limit: 1, role: 'COACH' }),
      listUsers(token, { limit: 1, role: 'ADMIN' }),
      listUsers(token, { page, limit: 20, q, role }),
    ])
    return { ok: true, data: { all, athletes, coaches, admins, list } }
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error }
    throw error
  }
}

export default function UsersPage({ searchParams }: PageProps<'/admin/users'>) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
      <UsersSection searchParams={searchParams} />
    </Suspense>
  )
}

async function UsersSection({ searchParams }: { searchParams: Promise<Search> }) {
  await io()
  const params = await searchParams
  const page = Math.max(1, Number(single(params.page) ?? '1') || 1)
  const q = single(params.q)
  const role = normalizeRole(single(params.role))
  const query = { q, role }

  const token = await getToken()
  if (!token) redirect('/login')

  const result = await loadUsers(token, page, q, role)
  if (!result.ok) {
    return (
      <ErrorPanel
        code={result.error.code}
        message={getErrorMessage(result.error.code, result.error.message)}
        requestId={result.error.requestId}
      />
    )
  }

  const { all, athletes, coaches, admins, list } = result.data
  const metrics = getUserMetrics(all, athletes, coaches, admins)

  return (
    <div>
      <PageHeader
        eyebrow="BOX · Usuarios"
        title="Gestión de usuarios"
        subtitle="El motor del box. Gestioná atletas, entrenadores y administradores desde un mismo lugar."
        actions={<CreateUserTrigger />}
      />

      <UserMetrics {...metrics} />

      {/* TODO: confirmar si «Ver vencidas» refiere a membresías vencidas por atleta. */}
      <div className="mt-3 flex justify-end">
        <Link
          href="/admin/memberships?status=EXPIRED"
          className="text-sm text-brand underline underline-offset-4"
        >
          Ver vencidas
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <input
          name="q"
          aria-label="Buscar por nombre o email"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre o email"
          className="min-w-64 flex-1 rounded-lg border bg-white px-3 py-2.5 text-sm"
        />
        <select
          name="role"
          aria-label="Filtrar por rol"
          defaultValue={role ?? ''}
          className="rounded-lg border bg-white px-3 py-2.5 text-sm"
        >
          <option value="">Todos los roles</option>
          <option value="ATHLETE">Atleta</option>
          <option value="COACH">Entrenador</option>
          <option value="ADMIN">Administrador</option>
        </select>
        <button type="submit" className="rounded-lg border px-4 py-2.5 text-sm">
          Buscar
        </button>
      </form>

      <div className="mt-6">
        {list.users.length === 0 ? (
          <EmptyState
            title="No hay usuarios para este filtro"
            description="Probá con otro término de búsqueda o dalo de alta con «+ Nuevo»."
          />
        ) : (
          <UserTable users={list.users} meta={list.meta} query={query} />
        )}
      </div>
    </div>
  )
}
