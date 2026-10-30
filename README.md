# Nexus Ingeniería — Plataforma web

Sitio público y panel privado de Nexus Ingeniería. El plan completo está en
[`plan-implementacion.md`](plan-implementacion.md).

## Desarrollo local

```bash
cp .env.example .env.local   # completar con las claves de Supabase
pnpm install
pnpm dev
```

Comprobar la conexión con Supabase: abrir `/api/salud` → `{"supabase":"ok"}`.

## Despliegue

Netlify, conectado al repositorio de GitHub. Variables de entorno en
Netlify → Site configuration → Environment variables (las mismas de `.env.example`).

## Usuarios del panel (alta administrativa)

El registro público está deshabilitado. Para dar acceso a un socio:

1. Supabase → **Authentication → Users → Add user → Create new user**, con correo,
   contraseña y **Auto Confirm User** marcado. El trigger crea su perfil con rol `none`.
2. Supabase → **SQL Editor**, activar el rol de socio:

```sql
update public.profiles p
set role = 'partner', full_name = 'Nombre Apellido', title = 'Cargo'
from auth.users u
where u.id = p.id and u.email = 'correo@ejemplo.com';
```

Para quitar el acceso: `role = 'none'` (o borrar el usuario en Authentication).

## Migraciones

En `supabase/migrations/`, en orden. Se aplican pegándolas en **SQL Editor → Run**.

Antes de aplicarlas, probar los permisos en local (PGlite, sin servidor):

```bash
pnpm test:rls
```

## Firmas electrónicas (Fase 5)

Los clientes firman por un enlace sin cuenta; el servidor valida el token y sella
el PDF con `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API →
`service_role`). Esa clave:

- va **solo** en Netlify → Environment variables (y en `.env.local` para pruebas),
- **nunca** lleva el prefijo `NEXT_PUBLIC_` ni se pega en chats o documentos,
- salta RLS: el código la usa únicamente en `lib/supabase/admin.ts`.

Verificación pública de PDFs firmados: `/verificar`.
