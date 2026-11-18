import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UserTable } from './user-table'
import type { Meta, UserItem } from '@/types/api'

// Link de Next necesita el router de la app; acá sólo se valida el href.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
}))

afterEach(cleanup)

const user: UserItem = {
  user_id: 'u-1',
  email: 'camila@box-core.test',
  full_name: 'Camila Ruiz',
  phone: null,
  emergency_contact: null,
  role: 'COACH',
  is_active: true,
  // «Hoy» depende del reloj; se calcula en cada corrida para no quedar obsoleto.
  created_at: new Date().toISOString(),
}

const meta = (overrides: Partial<Meta> = {}): Meta => ({
  page: 1,
  limit: 20,
  total: 1,
  total_pages: 1,
  ...overrides,
})

describe('UserTable', () => {
  it('muestra nombre, rol y Alta con la etiqueta del box', () => {
    render(<UserTable users={[user]} meta={meta()} query={{}} />)

    expect(screen.getByText('Camila Ruiz')).toBeInTheDocument()
    expect(screen.getByText('camila@box-core.test')).toBeInTheDocument()
    expect(screen.getByText('Entrenador')).toBeInTheDocument()
    expect(screen.getByText('Activo')).toBeInTheDocument()
    expect(screen.getAllByText(/Hoy, \d{2}:\d{2}/).length).toBeGreaterThan(0)
  })

  it('deshabilita «siguiente» cuando meta.total_pages === 0', () => {
    render(<UserTable users={[]} meta={meta({ total: 0, total_pages: 0 })} query={{}} />)

    expect(screen.queryByRole('link', { name: 'siguiente' })).not.toBeInTheDocument()
    expect(screen.getByText('siguiente')).toHaveClass('text-muted')
    expect(screen.queryByRole('link', { name: 'anterior' })).not.toBeInTheDocument()
  })

  it('habilita «siguiente» con page < total_pages y conserva la query', () => {
    render(
      <UserTable
        users={[user]}
        meta={meta({ page: 1, total: 60, total_pages: 3 })}
        query={{ q: 'Camila', role: 'COACH' }}
      />,
    )

    expect(screen.getByRole('link', { name: 'siguiente' })).toHaveAttribute(
      'href',
      '/admin/users?q=Camila&role=COACH&page=2',
    )
  })

  it('deshabilita «siguiente» en la última página', () => {
    render(
      <UserTable users={[user]} meta={meta({ page: 3, total: 60, total_pages: 3 })} query={{}} />,
    )

    expect(screen.queryByRole('link', { name: 'siguiente' })).not.toBeInTheDocument()
  })
})
