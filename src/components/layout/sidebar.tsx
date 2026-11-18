'use client'

import { NavLinks } from '@/components/layout/nav-links'
import { getInitials } from '@/lib/admin-view'
import type { NavItem } from '@/lib/nav'

export function Sidebar({
  items,
  displayName,
  roleLabel,
  fullName,
  open,
  onClose,
}: {
  items: NavItem[]
  displayName: string
  roleLabel: string
  fullName: string
  open: boolean
  onClose: () => void
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-10 bg-black/40 lg:hidden"
        />
      )}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-[15] flex w-64 flex-col border-r bg-surface p-5 pt-20 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:pt-5 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <LinkBrand />
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-muted lg:hidden"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-xl border p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {getInitials(fullName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{displayName}</span>
            <span className="block text-xs text-muted">{roleLabel}</span>
          </span>
        </div>

        <div className="mt-8">
          <NavLinks items={items} onNavigate={onClose} />
        </div>

        <p className="mt-auto pt-6 text-xs text-muted">BOX · Gestión integral</p>
      </aside>
    </>
  )
}

function LinkBrand() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
        B
      </span>
      <span className="text-lg font-semibold tracking-[0.2em]">BOX</span>
    </div>
  )
}
