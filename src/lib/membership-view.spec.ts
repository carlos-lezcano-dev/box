import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MembershipChip } from '@/components/features/memberships/membership-chip'
import { MembershipStatusBadge } from '@/components/features/memberships/membership-status-badge'
import {
  formatCurrency,
  getDaysRemaining,
  getStatusLabel,
  getValidityLabel,
  pickCurrent,
  toMembershipView,
} from '@/lib/membership-view'
import type { Membership, MembershipStatus } from '@/types/api'

function makeMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    membership_id: '11111111-1111-4111-8111-111111111111',
    user_id: '22222222-2222-4222-8222-222222222222',
    plan_name: 'Libre mensual',
    amount_paid: 6240000,
    start_date: '2026-11-01',
    end_date: '2026-11-30',
    status: 'ACTIVE',
    payment_method: 'TRANSFER',
    notes: null,
    created_by: null,
    created_at: '2026-11-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('membership-view', () => {
  it('calcula los días restantes con end_date inclusivo', () => {
    expect(getDaysRemaining('2026-11-30', '2026-11-17')).toBe(13)
    expect(getDaysRemaining('2026-11-17', '2026-11-17')).toBe(0)
    expect(getDaysRemaining('2026-11-16', '2026-11-17')).toBe(0)
  })

  it('muestra «Vigente hasta hoy» cuando vence hoy', () => {
    expect(getValidityLabel('2026-11-17', '2026-11-17')).toBe('Vigente hasta hoy')
    expect(getValidityLabel('2026-11-30', '2026-11-17')).toBe('Vigente hasta el 30/11')
  })

  it('expone la etiqueta de los cuatro estados', () => {
    const expected: Record<MembershipStatus, string> = {
      ACTIVE: 'Activa',
      EXPIRED: 'Vencida',
      FROZEN: 'Congelada',
      CANCELLED: 'Cancelada',
    }
    ;(Object.keys(expected) as MembershipStatus[]).forEach((status) => {
      expect(getStatusLabel(status)).toBe(expected[status])
    })
  })

  it('el badge de la vista de atleta usa «Al día» para ACTIVE y nunca para EXPIRED', () => {
    const { unmount } = render(createElement(MembershipStatusBadge, { status: 'ACTIVE' }))
    expect(screen.getByText('Al día')).toBeInTheDocument()
    unmount()

    render(createElement(MembershipStatusBadge, { status: 'EXPIRED' }))
    expect(screen.getByText('Vencida')).toBeInTheDocument()
    expect(screen.queryByText('Al día')).not.toBeInTheDocument()
  })

  it('elige la ACTIVE con end_date más próximo', () => {
    const later = makeMembership({
      membership_id: 'later',
      end_date: '2026-12-31',
    })
    const nearest = makeMembership({
      membership_id: 'nearest',
      end_date: '2026-11-20',
    })
    const expired = makeMembership({
      membership_id: 'expired',
      end_date: '2026-11-30',
      status: 'EXPIRED',
    })

    expect(pickCurrent([later, expired, nearest])?.membership_id).toBe('nearest')
  })

  it('si no hay activas elige la más reciente por end_date', () => {
    const older = makeMembership({
      membership_id: 'older',
      end_date: '2026-09-30',
      status: 'EXPIRED',
    })
    const recent = makeMembership({
      membership_id: 'recent',
      end_date: '2026-10-31',
      status: 'FROZEN',
    })

    expect(pickCurrent([older, recent])?.membership_id).toBe('recent')
    expect(pickCurrent([])).toBeNull()
  })

  it('formatea el importe como PYG sin decimales', () => {
    expect(formatCurrency(6240000)).toBe('$6.240.000')
  })

  it('marca el aviso de vencimiento próximo solo para ACTIVE con ≤ 7 días', () => {
    const soon = toMembershipView(
      makeMembership({ end_date: '2026-11-20' }),
      '2026-11-17',
    )
    expect(soon.daysRemaining).toBe(3)
    expect(soon.nearExpiration).toBe(true)
    expect(soon.amountLabel).toBe('$6.240.000')
    expect(soon.validityLabel).toBe('Vigente hasta el 20/11')

    const expiredSoon = toMembershipView(
      makeMembership({ end_date: '2026-11-20', status: 'EXPIRED' }),
      '2026-11-17',
    )
    expect(expiredSoon.nearExpiration).toBe(false)
  })

  it('oculta MembershipChip cuando planName es nulo', () => {
    const { container } = render(createElement(MembershipChip, { planName: null }))

    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId('membership-chip')).not.toBeInTheDocument()
  })

  it('muestra el plan en MembershipChip cuando está vigente', () => {
    render(createElement(MembershipChip, { planName: 'Libre mensual' }))

    expect(screen.getByTestId('membership-chip')).toHaveTextContent('Libre mensual')
  })
})
