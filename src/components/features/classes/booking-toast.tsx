import Link from 'next/link'
import type { BookingNotice } from '@/hooks/use-book-action'

/** Éxito = status, error = alert. El texto del mensaje nunca depende del color. */
export function BookingToast({
  notice,
  onDismiss,
}: {
  notice: BookingNotice | null
  onDismiss?: () => void
}) {
  if (!notice) return null
  const isError = notice.kind === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      data-testid="booking-toast"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        isError
          ? 'border-amber-300 bg-amber-50 text-amber-900'
          : 'border-emerald-300 bg-emerald-50 text-emerald-900'
      }`}
    >
      <p className="font-medium">
        {notice.message}
        {notice.code && (
          <span className="ml-2 font-mono text-xs opacity-70">{notice.code}</span>
        )}
      </p>
      <div className="flex items-center gap-3">
        {notice.href && notice.ctaLabel && (
          <Link href={notice.href} className="font-semibold underline">
            {notice.ctaLabel}
          </Link>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar notificación"
            className="text-xs underline"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  )
}
