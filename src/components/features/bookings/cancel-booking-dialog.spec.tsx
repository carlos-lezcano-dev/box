import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CancelBookingDialog } from './cancel-booking-dialog'
import type { BookingView } from '@/lib/booking-view'

afterEach(cleanup)

const booking: BookingView = {
  booking_id: 'booking-1',
  wod_id: 'wod-1',
  title: 'Fuerza + metcon',
  coach_full_name: null,
  start_time: '2026-11-20T22:00:00.000Z',
  end_time: '2026-11-20T23:00:00.000Z',
  status: 'CONFIRMED',
  waitlist_position: null,
  available_slots: 0,
  statusLabel: 'Confirmada',
  waitlistLabel: null,
  canCancel: true,
  slotLabel: 'Sin cupo',
}

function renderDialog(overrides: Partial<React.ComponentProps<typeof CancelBookingDialog>> = {}) {
  const onClose = vi.fn()
  const onConfirm = vi.fn()
  const result = render(
    <CancelBookingDialog
      open
      booking={booking}
      pending={false}
      error={null}
      onClose={onClose}
      onConfirm={onConfirm}
      {...overrides}
    />,
  )
  return { ...result, onClose, onConfirm }
}

describe('CancelBookingDialog', () => {
  it('muestra el título exacto, el turno y las acciones', () => {
    renderDialog()

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('heading', { name: '¿Cancelar tu reserva?' })).toBeInTheDocument()
    expect(screen.getByText(/Fuerza \+ metcon/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar cancelación' })).toBeInTheDocument()
  })

  it('pone el foco inicial en Volver y bloquea el scroll de fondo', () => {
    const { unmount } = renderDialog()

    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('cierra con Escape', () => {
    const { onClose } = renderDialog()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('devuelve el foco al elemento previo al cerrar', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Cancelar reserva'
    document.body.appendChild(trigger)
    trigger.focus()

    const { unmount } = renderDialog()
    expect(screen.getByRole('button', { name: 'Volver' })).toHaveFocus()

    unmount()
    expect(trigger).toHaveFocus()
    trigger.remove()
  })

  it('deshabilita los botones mientras la cancelación está pendiente', () => {
    renderDialog({ pending: true })

    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelando…' })).toBeDisabled()
  })
})
