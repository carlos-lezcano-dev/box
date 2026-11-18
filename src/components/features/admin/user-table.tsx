import Link from 'next/link'
import { getInitials, getRoleLabel } from '@/lib/admin-view'
import { formatCreatedAt } from '@/lib/datetime'
import type { Meta, UserItem } from '@/types/api'

function buildHref(page: number, query: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  params.set('page', String(page))
  return `/admin/users?${params.toString()}`
}

export function UserTable({
  users,
  meta,
  query,
}: {
  users: UserItem[]
  meta?: Meta
  query: Record<string, string | undefined>
}) {
  const page = meta?.page ?? 1
  const totalPages = meta?.total_pages ?? 0
  const canGoBack = page > 1
  const canGoNext = totalPages > 0 && page < totalPages

  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Usuario</th>
            <th className="px-5 py-3 font-medium">Email</th>
            <th className="px-5 py-3 font-medium">Rol</th>
            <th className="px-5 py-3 font-medium">Alta</th>
            <th className="px-5 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map((user) => (
            <tr key={user.user_id}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold">
                    {getInitials(user.full_name)}
                  </span>
                  <span className="font-medium">{user.full_name}</span>
                </div>
              </td>
              <td className="px-5 py-4 text-muted">{user.email}</td>
              <td className="px-5 py-4">
                <span className="rounded-full border px-2.5 py-1 text-xs">
                  {getRoleLabel(user.role)}
                </span>
              </td>
              <td className="px-5 py-4 text-muted">{formatCreatedAt(user.created_at)}</td>
              <td className="px-5 py-4">
                <span className={user.is_active ? 'text-emerald-700' : 'text-red-700'}>
                  {user.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
        <span className="text-muted">
          {meta?.total ?? 0} usuarios · página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          {canGoBack ? (
            <Link
              href={buildHref(page - 1, query)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              anterior
            </Link>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-sm text-muted">anterior</span>
          )}
          {canGoNext ? (
            <Link
              href={buildHref(page + 1, query)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              siguiente
            </Link>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-sm text-muted">siguiente</span>
          )}
        </div>
      </div>
    </div>
  )
}
