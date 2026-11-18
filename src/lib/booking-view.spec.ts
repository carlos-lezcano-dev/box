import { describe, expect, it } from 'vitest'
import {
  filterActive,
  formatWaitlistPosition,
  getStatusLabel,
  getWaitlistLabel,
  groupByStatus,
  sortByStartTime,
  toBookingView,
  type BookingStatus,
} from './booking-view'
import type { Booking } from '@/types/api'

const NOW = new Date('2026-11-17T12:00:00.000Z')

function makeBooking(status: BookingStatus, overrides: Partial<Booking> = {}): Booking {
  return {
    booking_id: `booking-${status}`,
    wod_id: 'wod-1',
    user_id: 'user-1',
    status,
    booked_at: '2026-11-16T10:00:00.000Z',
    confirmed_at: null,
    promoted_at: null,
    cancelled_at: null,
    waitlist_position: null,
    wod: {
      title: 'Fuerza + metcon',
      start_time: '2026-11-20T22:00:00.000Z',
      end_time: '2026-11-20T23:00:00.000Z',
      available_slots: 3,
    },
    ...overrides,
  }
}

describe('filterActive', () => {
  it('excluye CANCELLED y NOSHOW', () => {
    const bookings = [
      makeBooking('CONFIRMED'),
      makeBooking('WAITLIST'),
      makeBooking('CANCELLED'),
      makeBooking('NOSHOW'),
    ]

    expect(filterActive(bookings).map((booking) => booking.status)).toEqual([
      'CONFIRMED',
      'WAITLIST',
    ])
  })
})

describe('sortByStartTime', () => {
  it('ordena por ISO string sin mutar la entrada', () => {
    const bookings = [
      makeBooking('CONFIRMED', {
        booking_id: 'tarde',
        wod: {
          title: 'Tarde',
          start_time: '2026-11-25T18:00:00.000Z',
          end_time: '2026-11-25T19:00:00.000Z',
        },
      }),
      makeBooking('CONFIRMED', {
        booking_id: 'temprano',
        wod: {
          title: 'Temprano',
          start_time: '2026-11-18T07:00:00.000Z',
          end_time: '2026-11-18T08:00:00.000Z',
        },
      }),
    ]

    const views = bookings.map((booking) => toBookingView(booking, NOW))
    expect(sortByStartTime(views).map((booking) => booking.booking_id)).toEqual([
      'temprano',
      'tarde',
    ])
    expect(views[0]?.booking_id).toBe('tarde')
  })
})

describe('getStatusLabel', () => {
  it('etiqueta los cuatro estados', () => {
    expect(getStatusLabel('CONFIRMED')).toBe('Confirmada')
    expect(getStatusLabel('WAITLIST')).toBe('Lista de espera')
    expect(getStatusLabel('CANCELLED')).toBe('Cancelada')
    expect(getStatusLabel('NOSHOW')).toBe('No show')
  })

  it('agrega la posición de la waitlist cuando existe', () => {
    expect(getStatusLabel('WAITLIST', 3)).toBe('Lista de espera #3')
    expect(getWaitlistLabel(3)).toBe('Lista de espera #3')
  })
})

describe('posición de waitlist sin #null', () => {
  it('no muestra #null para posiciones ausentes o inválidas', () => {
    expect(formatWaitlistPosition(null)).toBeNull()
    expect(formatWaitlistPosition(undefined)).toBeNull()
    expect(formatWaitlistPosition(0)).toBeNull()
    expect(getWaitlistLabel(null)).toBe('Lista de espera')
    expect(getStatusLabel('WAITLIST', null)).toBe('Lista de espera')

    const view = toBookingView(
      makeBooking('WAITLIST', {
        waitlist_position: null,
      }),
      NOW,
    )
    expect(JSON.stringify(view)).not.toContain('#null')
    expect(view.statusLabel).toBe('Lista de espera')
    expect(view.waitlistLabel).toBe('Lista de espera')
  })
})

describe('toBookingView', () => {
  it('mapea los datos del wod anidado y deriva etiquetas', () => {
    const view = toBookingView(
      makeBooking('CONFIRMED', {
        wod: {
          title: 'Fuerza + metcon',
          coach_full_name: 'Coach de Prueba',
          start_time: '2026-11-20T22:00:00.000Z',
          end_time: '2026-11-20T23:00:00.000Z',
          available_slots: 0,
        },
      }),
      NOW,
    )

    expect(view.title).toBe('Fuerza + metcon')
    expect(view.coach_full_name).toBe('Coach de Prueba')
    expect(view.start_time).toBe('2026-11-20T22:00:00.000Z')
    expect(view.statusLabel).toBe('Confirmada')
    expect(view.slotLabel).toBe('Sin cupo')
    expect(view.canCancel).toBe(true)
  })

  it('deshabilita la cancelación de turnos pasados y de estados inactivos', () => {
    expect(toBookingView(makeBooking('CONFIRMED'), NOW).canCancel).toBe(true)
    expect(
      toBookingView(
        makeBooking('CONFIRMED', {
          wod: {
            title: 'Pasado',
            start_time: '2026-11-16T22:00:00.000Z',
            end_time: '2026-11-16T23:00:00.000Z',
          },
        }),
        NOW,
      ).canCancel,
    ).toBe(false)
    expect(toBookingView(makeBooking('CANCELLED'), NOW).canCancel).toBe(false)
  })
})

describe('groupByStatus', () => {
  it('separa confirmadas y lista de espera', () => {
    const views = [
      toBookingView(makeBooking('CONFIRMED'), NOW),
      toBookingView(makeBooking('WAITLIST', { waitlist_position: 2 }), NOW),
    ]

    expect(groupByStatus(views)).toEqual({
      confirmed: [views[0]],
      waitlist: [views[1]],
    })
  })
})
