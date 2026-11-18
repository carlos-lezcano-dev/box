import { describe, expect, it } from 'vitest'
import { getHeaderTitle, getNavItems } from '@/lib/nav'

function labels(items: Array<{ label: string; href: string }>) {
  return items.map(({ label, href }) => ({ label, href }))
}

describe('nav', () => {
  it('ATHLETE ve exactamente Explorar clases y Mis reservas', () => {
    expect(labels(getNavItems('ATHLETE'))).toEqual([
      { label: 'Explorar clases', href: '/classes' },
      { label: 'Mis reservas', href: '/bookings' },
    ])
  })

  it('ADMIN ve los cinco enlaces admin en sus destinos canónicos', () => {
    const items = getNavItems('ADMIN')

    expect(labels(items)).toEqual(
      expect.arrayContaining([
        { label: 'Panel general', href: '/' },
        { label: 'Agenda turnos', href: '/admin/schedule' },
        { label: 'Usuarios', href: '/admin/users' },
        { label: 'Membresías y pagos', href: '/admin/memberships' },
        { label: 'Administración', href: '/admin' },
      ]),
    )
    expect(items.filter((item) => item.section === 'admin')).toHaveLength(5)
  })

  it('compone el título del encabezado según la ruta sin decidir su contenido', () => {
    const routes: Array<[string, string]> = [
      ['/', 'Panel general'],
      ['/classes', 'Explorar y reservar clases'],
      ['/bookings', 'Mis reservas'],
      ['/memberships', 'Membresías y pagos'],
      ['/admin', 'Administración'],
      ['/admin/schedule', 'Agenda de turnos'],
      ['/admin/users', 'Usuarios'],
      ['/admin/memberships', 'Membresías y pagos'],
      ['/ruta-desconocida', 'Espacio de trabajo'],
    ]

    routes.forEach(([pathname, title]) => {
      expect(getHeaderTitle(pathname), pathname).toBe(title)
    })
  })

  it('respeta subrutas de administración', () => {
    expect(getHeaderTitle('/admin/schedule/11111111-1111-4111-8111-111111111111')).toBe(
      'Agenda de turnos',
    )
  })
})
