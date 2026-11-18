export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-surface p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-2 text-sm text-muted">{description}</p>}
    </div>
  )
}

export function ErrorPanel({
  code,
  message,
  requestId,
}: {
  code: string
  message: string
  requestId?: string
}) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
      <p className="font-semibold">No pudimos cargar esta sección</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2 font-mono text-xs opacity-75">
        {code}
        {requestId ? ` · ${requestId}` : ''}
      </p>
    </div>
  )
}

export function TableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">{children}</table>
    </div>
  )
}
