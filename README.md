# BOX · frontend

Frontend de BOX construido con Next.js 16, React 19, Tailwind 4 y TypeScript strict.

## Configuración

Copiá `.env.example` a `.env.local` si la API no está en el puerto por defecto:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

La variable apunta a `box-core` **incluido el prefijo `/api/v1`**. Si no se define, el cliente usa ese valor por defecto.

## Desarrollo

La API corre en el puerto `3000`, así que el frontend debe iniciarse en otro puerto:

```bash
npm.cmd run dev -- -p 3001
```

> En Windows PowerShell usá `npm.cmd`; `npm run ...` puede fallar por la política de ejecución de scripts.

Abrí http://localhost:3001. Las rutas privadas redirigen a `/login`; la cookie de sesión es `httpOnly` y se escribe desde los Route Handlers de `app/api/auth/`.

## Verificación

```bash
npm.cmd run lint
npm.cmd run build
```

## Estructura

- `specs/` — contratos, diseño y planes por feature.
- `app/(auth)/` — login.
- `app/(app)/` — shell y rutas privadas, incluida `admin/`.
- `src/api/` — cliente HTTP y acceso a endpoints.
- `src/actions/` — Server Actions para escrituras.
- `src/lib/` — sesión, errores, fechas y helpers compartidos.
