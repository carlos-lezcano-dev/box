import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WodScheduleList } from './wod-schedule-list'
import type { AdminWodView } from '@/lib/admin-view'
import type { Wod } from '@/types/api'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
}))

const wod = (id: string, title: string): AdminWodView =>
  ({
    wod_id: id,
    coach_id: null,
    title,
    description: null,
    start_time: '2026-11-20T23:00:00.000Z',
    end_time: '2026-11-21T00:00:00.000Z',
    max_capacity: 12,
    confirmed_count: 4,
    available_slots: 8,
    waitlist_count: 0,
    created_at: '2026-11-17T12:00:00.000Z',
    coachLabel: 'Sin asignar',
    dayHeader: 'VIE 20',
    timeLabel: '20:00',
  }) satisfies Wod & AdminWodView

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TypeFilter en la agenda', () => {
  it('parte en «Tipo: todos» y filtra sólo el arreglo cargado', () => {
    render(
      <WodScheduleList
        wods={[wod('w1', 'Fuerza E2E'), wod('w2', 'Movilidad E2E')]}
      />,
    )

    const select = screen.getByRole('combobox', { name: /Tipo/ })
    expect(select).toHaveValue('todos')
    expect(screen.getByText('Fuerza E2E')).toBeInTheDocument()
    expect(screen.getByText('Movilidad E2E')).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'MOVILIDAD' } })

    expect(screen.queryByText('Fuerza E2E')).not.toBeInTheDocument()
    expect(screen.getByText('Movilidad E2E')).toBeInTheDocument()
    expect(screen.getByText('1 turnos en este rango')).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'todos' } })
    expect(screen.getByText('Fuerza E2E')).toBeInTheDocument()
  })

  it('no agrega claves type a la query ni dispara fetches', () => {
    render(<WodScheduleList wods={[wod('w1', 'Fuerza E2E'), wod('w2', 'Movilidad E2E')]} />)

    const select = screen.getByRole('combobox', { name: /Tipo/ })
    fireEvent.change(select, { target: { value: 'FUERZA' } })

    expect(window.location.search).toBe('')
    expect(window.location.href).not.toContain('type=')
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
    expect(select).toHaveValue('FUERZA')
  })
})
