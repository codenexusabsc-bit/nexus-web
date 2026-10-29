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
