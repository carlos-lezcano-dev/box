import type { Role } from '@/types/api'

export type NavSection = 'atleta' | 'admin'

export type NavItem = {
  label: string
  href: string
  section: NavSection
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Explorar clases',
    href: '/classes',
    section: 'atleta',
    roles: ['ATHLETE', 'COACH'],
  },
  {
    label: 'Mis reservas',
    href: '/bookings',
    section: 'atleta',
    roles: ['ATHLETE', 'COACH'],
  },
  {
    label: 'Panel general',
    href: '/',
    section: 'admin',
    roles: ['ADMIN'],
  },
  {
    label: 'Agenda turnos',
    href: '/admin/schedule',
    section: 'admin',
    roles: ['ADMIN'],
  },
  {
    label: 'Usuarios',
    href: '/admin/users',
    section: 'admin',
    roles: ['ADMIN'],
  },
  {
    label: 'Membresías y pagos',
    href: '/admin/memberships',
    section: 'admin',
    roles: ['ADMIN'],
  },
  {
    label: 'Administración',
    href: '/admin',
    section: 'admin',
    roles: ['ADMIN'],
  },
]

export function getNavItems(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

const TITLE_RULES: Array<{ prefix: string; title: string }> = [
  { prefix: '/admin/memberships', title: 'Membresías y pagos' },
  { prefix: '/admin/schedule', title: 'Agenda de turnos' },
  { prefix: '/admin/users', title: 'Usuarios' },
  { prefix: '/admin', title: 'Administración' },
  { prefix: '/classes', title: 'Explorar y reservar clases' },
  { prefix: '/bookings', title: 'Mis reservas' },
  { prefix: '/memberships', title: 'Membresías y pagos' },
]

/** Título de sección del encabezado; nunca decide el contenido de la ruta. */
export function getHeaderTitle(pathname: string): string {
  if (pathname === '/') return 'Panel general'
  return TITLE_RULES.find((rule) => pathname.startsWith(rule.prefix))?.title ?? 'Espacio de trabajo'
}
