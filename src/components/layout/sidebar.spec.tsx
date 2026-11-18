import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '@/components/layout/sidebar'
import type { NavItem } from '@/lib/nav'

const { pathname } = vi.hoisted(() => ({ pathname: { value: '/' } }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.value,
}))

// Evita necesitar el router de la app: acá sólo se valida aria-current.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
}))

const ATHLETE_ITEMS: NavItem[] = [
  { label: 'Explorar clases', href: '/classes', section: 'atleta', roles: ['ATHLETE'] },
  { label: 'Mis reservas', href: '/bookings', section: 'atleta', roles: ['ATHLETE'] },
]

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Panel general', href: '/', section: 'admin', roles: ['ADMIN'] },
  { label: 'Administración', href: '/admin', section: 'admin', roles: ['ADMIN'] },
]

function renderSidebar(items: NavItem[] = ATHLETE_ITEMS) {
  return render(
    <Sidebar
      items={items}
      displayName="Lucía"
      roleLabel="Atleta"
      fullName="Lucía Martínez"
      open={false}
      onClose={vi.fn()}
    />,
  )
}

afterEach(() => {
  cleanup()
  pathname.value = '/'
})

describe('Sidebar', () => {
  it('marca aria-current="page" sólo en el enlace de la ruta activa', () => {
    pathname.value = '/bookings'
    renderSidebar()

    expect(screen.getByRole('link', { name: 'Mis reservas' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Explorar clases' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('considera activo el enlace raíz y el de subrutas', () => {
    pathname.value = '/'
    const { unmount } = renderSidebar(ADMIN_ITEMS)
    expect(screen.getByRole('link', { name: 'Panel general' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    unmount()

    pathname.value = '/classes/2026-11-20'
    renderSidebar()
    expect(screen.getByRole('link', { name: 'Explorar clases' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('muestra la marca y el nombre del usuario', () => {
    pathname.value = '/classes'
    renderSidebar()

    expect(screen.getByText('BOX')).toBeInTheDocument()
    expect(screen.getByText('Lucía')).toBeInTheDocument()
    expect(screen.getByText('Atleta')).toBeInTheDocument()
  })
})
