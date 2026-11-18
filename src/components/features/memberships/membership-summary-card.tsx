import { MembershipStatusBadge } from '@/components/features/memberships/membership-status-badge'
import { formatShortDate, type MembershipView } from '@/lib/membership-view'
import type { PaymentMethod } from '@/types/api'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CREDIT_CARD: 'Tarjeta de crédito',
}

export function MembershipSummaryCard({ view }: { view: MembershipView }) {
  return (
    <article
      aria-labelledby="membership-summary-title"
      className="flex h-full w-full flex-col gap-6 rounded-2xl border bg-surface p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Tu membresía
          </p>
          <h2 id="membership-summary-title" className="mt-1 truncate text-2xl font-semibold">
            {view.plan_name}
          </h2>
        </div>
        <MembershipStatusBadge status={view.status} />
      </div>

      <p className="text-3xl font-semibold tracking-tight">{view.amountLabel}</p>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Vigencia</dt>
          <dd className="mt-1 text-sm">{view.validityLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Desde</dt>
          <dd className="mt-1 text-sm">{formatShortDate(view.start_date)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Días restantes</dt>
          <dd className="mt-1 text-sm">{view.daysRemaining}</dd>
        </div>
      </dl>

      {view.nearExpiration && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {view.daysRemaining === 0
            ? 'Tu membresía vence hoy. Renovala para seguir entrenando.'
            : `Tu membresía vence en ${view.daysRemaining} ${
                view.daysRemaining === 1 ? 'día' : 'días'
              }. Renovala para seguir entrenando.`}
        </p>
      )}
    </article>
  )
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  return PAYMENT_METHOD_LABELS[method]
}
