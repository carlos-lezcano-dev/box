'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { getDisplayName, getRoleLabel } from '@/lib/display'
import { getHeaderTitle, getNavItems } from '@/lib/nav'
import type { CurrentUser } from '@/types/api'

export type HeaderMembership = {
  planName: string
  hasActiveMembership: boolean
}

export function AppChrome({
  user,
  membership,
  children,
}: {
  user: CurrentUser
  membership?: HeaderMembership | null
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <Sidebar
        items={getNavItems(user.role)}
        displayName={getDisplayName(user.full_name, user.email)}
        roleLabel={getRoleLabel(user.role)}
        fullName={user.full_name}
        open={open}
        onClose={() => setOpen(false)}
      />
      <div className="flex min-w-0 flex-col">
        <Header
          roleLabel={getRoleLabel(user.role)}
          title={getHeaderTitle(pathname)}
          displayName={getDisplayName(user.full_name, user.email)}
          membershipPlan={membership?.hasActiveMembership ? membership.planName : null}
          menuOpen={open}
          onMenu={() => setOpen((value) => !value)}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
