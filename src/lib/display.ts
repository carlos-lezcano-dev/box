import type { Role } from '@/types/api'

export const ROLE_LABELS: Record<Role, string> = {
  ATHLETE: 'Atleta',
  COACH: 'Entrenador',
  ADMIN: 'Administrador',
}

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role]
}

export function getDisplayName(fullName: string, email: string): string {
  const name = fullName.trim()
  if (name) return name.split(/\s+/)[0] ?? name
  return email.split('@')[0] || email
}
