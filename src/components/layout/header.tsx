'use client'

import { useRouter } from 'next/navigation'
import { MembershipChip } from '@/components/features/memberships/membership-chip'
import { UserMenu } from '@/components/layout/user-menu'

export function Header({
  roleLabel,
  title,
  displayName,
  membershipPlan,
  menuOpen,
  onMenu,
}: {
  roleLabel: string
  title: string
  displayName: string
  membershipPlan: string | null
  menuOpen: boolean
  onMenu: () => void
}) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-surface/95 px-4 py-4 backdrop-blur sm:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-controls="app-sidebar"
        aria-expanded={menuOpen}
        className="rounded-lg border px-3 py-2 text-sm lg:hidden"
      >
        ☰
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-muted">
          {roleLabel} · {title}
        </p>
      </div>
      <span className="hidden rounded-full border px-3 py-1 text-xs font-medium sm:inline">
        {roleLabel}
      </span>
      <MembershipChip planName={membershipPlan} />
      <UserMenu displayName={displayName} roleLabel={roleLabel} onLogout={handleLogout} />
    </header>
  )
}
