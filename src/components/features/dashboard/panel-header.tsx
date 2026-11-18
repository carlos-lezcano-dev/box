/** Encabezado fijo del panel general administrativo (F3). */
export function PanelHeader() {
  return (
    <header className="mb-8 border-b pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-600">BOX</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Panel general administrativo
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        Todo listo para un día más fuerte.
      </p>
    </header>
  )
}
