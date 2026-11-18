import Link from 'next/link'
import { MembershipStatusSelect } from '@/components/features/admin/membership-status-select'
import { toMembershipView } from '@/lib/admin-view'
import type { Meta, Membership } from '@/types/api'

function buildHref(page: number, query: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  params.set('page', String(page))
  return `/admin/memberships?${params.toString()}`
}

export function AdminMembershipTable({
  memberships,
  meta,
  query,
}: {
  memberships: Membership[]
  meta?: Meta
  query: Record<string, string | undefined>
}) {
  const page = meta?.page ?? 1
  const totalPages = meta?.total_pages ?? 0
  const rows = memberships.map(toMembershipView)

  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-5 py-3 font-medium">Atleta</th>
            <th className="px-5 py-3 font-medium">Plan</th>
            <th className="px-5 py-3 font-medium">Importe</th>
            <th className="px-5 py-3 font-medium">Vigencia</th>
            <th className="px-5 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.membership_id}>
              <td className="px-5 py-4">
                <Link href={`/admin/users?q=${encodeURIComponent(row.user_id)}`} className="font-mono text-xs">
                  {row.user_id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-5 py-4 font-medium">{row.plan_name}</td>
              <td className="px-5 py-4">{row.amountLabel}</td>
              <td className="px-5 py-4 text-muted">
                {row.startDateLabel} → {row.endDateLabel}
              </td>
              <td className="px-5 py-4">
                <MembershipStatusSelect
                  membershipId={row.membership_id}
                  status={row.status}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t px-5 py-3 text-sm">
        <span className="text-muted">
          {meta?.total ?? 0} membresías · página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={buildHref(page - 1, query)} className="rounded-lg border px-3 py-2">
              anterior
            </Link>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-muted">anterior</span>
          )}
          {totalPages > 0 && page < totalPages ? (
            <Link href={buildHref(page + 1, query)} className="rounded-lg border px-3 py-2">
              siguiente
            </Link>
          ) : (
            <span className="rounded-lg border px-3 py-2 text-muted">siguiente</span>
          )}
        </div>
      </div>
    </div>
  )
}
