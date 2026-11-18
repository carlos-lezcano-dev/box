import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RegisterPaymentForm } from './register-payment-form'

const mocks = vi.hoisted(() => ({
  createMembershipAction: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/actions/admin', () => ({
  createMembershipAction: mocks.createMembershipAction,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const users = [
  {
    user_id: 'u-1',
    full_name: 'Camila Ruiz',
    email: 'camila@box-core.test',
  },
]

afterEach(cleanup)

beforeEach(() => {
  let counter = 0
  vi.stubGlobal('crypto', { randomUUID: () => `key-${++counter}` })
  mocks.createMembershipAction.mockReset()
  mocks.refresh.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderForm(onClose = vi.fn()) {
  render(<RegisterPaymentForm open onClose={onClose} users={users} />)
  return { onClose, form: document.querySelector('form') as HTMLFormElement }
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Atleta'), { target: { value: 'u-1' } })
  fireEvent.change(screen.getByLabelText('Plan'), { target: { value: 'Libre mensual' } })
  fireEvent.change(screen.getByLabelText('Importe'), { target: { value: '250000' } })
  fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-11-01' } })
  fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-11-30' } })
}

async function submit(form: HTMLFormElement) {
  fireEvent.submit(form)
  await waitFor(() => expect(mocks.createMembershipAction).toHaveBeenCalled())
}

describe('RegisterPaymentForm', () => {
  it('reutiliza la Idempotency-Key en dos envíos y la regenera tras el conflicto confirmado', async () => {
    mocks.createMembershipAction
      .mockResolvedValueOnce({
        ok: false,
        code: 'SERVICE_UNAVAILABLE',
        message: 'No se pudo conectar con la API.',
      })
      .mockResolvedValueOnce({
        ok: false,
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'La clave de idempotencia ya se usó con otros datos.',
      })
      .mockResolvedValueOnce({ ok: true })

    const { form, onClose } = renderForm()
    fillValidForm()

    await submit(form)
    await waitFor(() =>
      expect(mocks.createMembershipAction).toHaveBeenCalledTimes(1),
    )

    // Reintento de red: la intención es la misma, la clave no cambia.
    fireEvent.submit(form)
    await waitFor(() => expect(mocks.createMembershipAction).toHaveBeenCalledTimes(2))
    expect(mocks.createMembershipAction.mock.calls.map((call) => call[1])).toEqual([
      'key-1',
      'key-1',
    ])
    const regenerate = await screen.findByRole('button', {
      name: 'Generar nueva clave y reintentar',
    })

    // Sólo después de confirmar el conflicto se crea una nueva clave.
    fireEvent.click(regenerate)
    expect(
      screen.queryByRole('button', { name: 'Generar nueva clave y reintentar' }),
    ).not.toBeInTheDocument()

    fireEvent.submit(form)
    await waitFor(() => expect(mocks.createMembershipAction).toHaveBeenCalledTimes(3))
    expect(mocks.createMembershipAction.mock.calls.map((call) => call[1])).toEqual([
      'key-1',
      'key-1',
      'key-2',
    ])
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it('decide por code/fields, no por el texto de message', async () => {
    mocks.createMembershipAction.mockResolvedValueOnce({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'La clave de idempotencia ya se usó con otros datos.',
      fields: { amount_paid: 'El importe no es válido.' },
    })

    const { form } = renderForm()
    fillValidForm()
    fireEvent.submit(form)

    expect(
      await screen.findByText('El importe no es válido.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('spinbutton', { name: /Importe/ }),
    ).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.queryByRole('button', { name: 'Generar nueva clave y reintentar' }),
    ).not.toBeInTheDocument()
    expect(mocks.createMembershipAction.mock.calls[0]?.[1]).toBe('key-1')
  })
})
