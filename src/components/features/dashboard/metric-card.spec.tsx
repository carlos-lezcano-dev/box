import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricCard } from './metric-card'

describe('MetricCard', () => {
  it('no renderiza tarjeta cuando la métrica no tiene fuente (value === null)', () => {
    const { container } = render(<MetricCard label="Recaudación" value={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el valor con tabular-nums en estado success', () => {
    render(<MetricCard label="Atletas" value={148} testId="athletes" />)
    const card = screen.getByTestId('athletes')
    expect(card).toHaveTextContent('148')
    expect(card.querySelector('.tabular-nums')).not.toBeNull()
  })

  it('aísla el error en su propia tarjeta', () => {
    render(
      <MetricCard
        label="Membresías"
        value={null}
        state="error"
        code="INTERNAL_ERROR"
        message="No se pudo cargar el total."
        testId="memberships"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un error inesperado.')
    expect(screen.getByTestId('memberships')).toHaveTextContent('Membresías')
  })

  it('expone estados loading y empty', () => {
    const { unmount } = render(<MetricCard label="Atletas" value={null} state="loading" />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando Atletas')
    unmount()

    render(<MetricCard label="Turnos" value={null} state="empty" />)
    expect(screen.getByText('Sin datos disponibles')).toBeVisible()
  })
})
