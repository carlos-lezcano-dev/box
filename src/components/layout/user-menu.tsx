'use client'

import { useEffect, useRef, useState } from 'react'

export function UserMenu({
  displayName,
  roleLabel,
  onLogout,
}: {
  displayName: string
  roleLabel: string
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Opciones de usuario"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-brand-soft"
      >
        <span className="hidden sm:inline">{displayName}</span>
        <span className="hidden rounded-full bg-brand-soft px-2 py-0.5 text-xs text-zinc-600 sm:inline">
          {roleLabel}
        </span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Opciones de usuario"
          className="absolute right-0 top-full z-30 mt-2 w-48 rounded-lg border bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-brand-soft"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
