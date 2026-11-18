import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = {
  title: 'Administración · BOX',
}

const CARDS = [
  {
    href: '/admin/users',
    title: 'Usuarios',
    description: 'Gestioná atletas, entrenadores y administradores desde un mismo lugar.',
  },
  {
    href: '/admin/schedule',
    title: 'Agenda turnos',
    description: 'Cada turno, bajo control. Cupos, entrenadores y lista de espera.',
  },
  {
    href: '/admin/memberships',
    title: 'Membresías y pagos',
    description: 'Vigencias claras. Cuentas al día.',
  },
]

export default function AdminHubPage() {
  return (
    <div>
      <PageHeader
        eyebrow="BOX · Administración"
        title="Administración"
        subtitle="Accesos rápidos a la gestión del box."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border bg-surface p-6 transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{card.description}</p>
            <span className="mt-5 inline-block text-sm font-medium">Abrir →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
