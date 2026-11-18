import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingRoster } from './booking-roster'
import type { WodRoster } from '@/types/api'

const mocks = vi.hoisted(() => ({
  cancelBookingAction: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/actions/admin', () => ({
  cancelBookingAction: mocks.cancelBookingAction,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const roster: WodRoster = {
  wod_id: 'wod-1',
  max_capacity: 12,
  confirmed_count: 12,
  waitlist_count: 2,
  confirmed: [
    {
      booking_id: 'b1',
      user_id: 'u1',
      full_name: 'Camila Ruiz',
      booked_at: '2026-11-17T12:00:00.000Z',
    },
  ],
  waitlist: [
    {
      booking_id: 'b3',
      user_id: 'u3',
      full_name: 'Julieta Paz',
      booked_at: '2026-11-17T12:02:00.000Z',
      position: 3,
    },
    {
      booking_id: 'b2',
      user_id: 'u2',
      full_name: 'Silvina Costa',
      booked_at: '2026-11-17T12:01:00.000Z',
      position: 1,
    },
  ],
}

beforeEach(() => {
  mocks.cancelBookingAction.mockReset()
  mocks.refresh.mockReset()
})

afterEach(cleanup)

describe('BookingRoster', () => {
  it('muestra AFORO desde los conteos y ordena la waitlist por position ASC', () => {
    render(<BookingRoster roster={roster} />)

    expect(screen.getByText('AFORO 12/12')).toBeInTheDocument()
    expect(screen.getByText('2 atletas')).toBeInTheDocument()
    expect(screen.getByText('CR')).toBeInTheDocument()

    const section = screen.getByRole('heading', { name: 'Lista de espera' }).closest('section')
    expect(section).not.toBeNull()
    const buttons = within(section as HTMLElement).getAllByRole('button', {
      name: 'Cancelar',
    })
    expect(buttons[0]?.parentElement).toHaveTextContent('Silvina Costa')
    expect(buttons[1]?.parentElement).toHaveTextContent('Julieta Paz')
  })

  it('anuncia la promoción con role="status" tras cancelar', async () => {
    mocks.cancelBookingAction.mockResolvedValueOnce({
      ok: true,
      message: 'Se promovió a la siguiente persona de la lista de espera.',
    })

    render(<BookingRoster roster={roster} />)

    const participants = screen
      .getByRole('heading', { name: 'Participantes' })
      .closest('section') as HTMLElement
    within(participants).getAllByRole('button', { name: 'Cancelar' })[0]?.click()

    const dialog = await screen.findByRole('dialog', { name: 'Cancelar reserva' })
    within(dialog).getByRole('button', { name: 'Cancelar reserva' }).click()

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Se promovió a la siguiente persona de la lista de espera',
      ),
    )
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
