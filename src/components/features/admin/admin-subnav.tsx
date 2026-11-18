'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/users', label: 'Usuarios' },
  { href: '/admin/schedule', label: 'Agenda turnos' },
  { href: '/admin/memberships', label: 'Membresías y pagos' },
]

export function AdminSubnav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navegación de administración"
      className="mb-8 flex gap-1 overflow-x-auto border-b"
    >
      {LINKS.map((link) => {
        const active =
          link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm ${
              active
                ? 'border-brand font-medium text-foreground'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
