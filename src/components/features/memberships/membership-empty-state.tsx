import Link from 'next/link'

export function MembershipEmptyState() {
  return (
    <section
      aria-labelledby="memberships-empty-title"
      className="w-full rounded-2xl border border-dashed bg-surface p-10 text-center"
    >
      <h2 id="memberships-empty-title" className="text-lg font-semibold">
        Todavía no registramos una membresía
      </h2>
      <p className="mt-2 text-sm text-muted">
        Cuando registres un pago, vas a poder ver acá tu plan y su vigencia.
      </p>
      <Link
        href="/classes"
        className="mt-6 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Explorar clases
      </Link>
    </section>
  )
}
