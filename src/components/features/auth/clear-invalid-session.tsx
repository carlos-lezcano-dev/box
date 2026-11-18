'use client'

import { useEffect, useRef } from 'react'

/**
 * Según la doc de Next 16, `cookies().delete()` sólo es válido en Route
 * Handlers o Server Functions, nunca en un Server Component. Cuando una página
 * detecta que la sesión no es válida, este componente pide una sola vez al
 * Route Handler local que elimine la cookie httpOnly vencida.
 */
export function ClearInvalidSession() {
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    requested.current = true

    void fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }).catch(() => {
      // No hay sesión que recuperar: un fallo al limpiar no debe romper la UI.
    })
  }, [])

  return null
}
