import { describe, expect, it } from 'vitest'
import { getDisplayName, getRoleLabel } from '@/lib/display'

describe('display', () => {
  it('muestra el primer nombre del full_name', () => {
    expect(getDisplayName('Lucía Martínez', 'lucia@example.com')).toBe('Lucía')
  })

  it('usa la parte local del email cuando no hay nombre', () => {
    expect(getDisplayName('', 'lucia@example.com')).toBe('lucia')
    expect(getDisplayName('   ', 'lucia@example.com')).toBe('lucia')
  })

  it('muestra las tres etiquetas de rol en español', () => {
    expect(getRoleLabel('ATHLETE')).toBe('Atleta')
    expect(getRoleLabel('COACH')).toBe('Entrenador')
    expect(getRoleLabel('ADMIN')).toBe('Administrador')
  })
})
