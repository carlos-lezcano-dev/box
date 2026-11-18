'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from '@/lib/nav'

export function NavLinks({
  items,
  onNavigate,
}: {
  items: NavItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : item.href === '/admin'
              ? pathname === '/admin'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
              active
                ? 'bg-brand font-medium text-white'
                : 'text-zinc-600 hover:bg-brand-soft hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
