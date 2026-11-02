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

## Contabilidad, correo y segundo factor (migraciones 010 a 012)

Aplicar `010_actividad.sql`, `011_portafolio.sql` y `012_contabilidad.sql` en ese orden
(antes: `pnpm test:rls`). Variables nuevas, en `.env.local` y en Netlify; **nunca** con
prefijo `NEXT_PUBLIC_` ni en chats o documentos:

| Variable | Para qué |
|----------|----------|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Cloudflare R2: imágenes de comprobantes y facturas |
| `SMTP_USER`, `SMTP_PASSWORD` | Gmail SMTP: cuenta de Nexus y su **contraseña de aplicación** (no la contraseña normal) |
| `SMTP_FROM_NAME` (opcional) | Nombre del remitente; por defecto «Nexus Ingeniería» |
| `SITE_URL` (opcional) | Base de los enlaces de los correos; por defecto la dirección de Netlify |

**R2, bucket privado.** Las subidas van directo del navegador con una URL firmada, así que el
bucket necesita CORS (Cloudflare → R2 → el bucket → Settings → CORS policy):

```json
[
  {
    "AllowedOrigins": ["https://nexus-ingenieria1.netlify.app", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

**Correo de tareas.** Cuando un socio asigna una tarea a otro, el asignado recibe un correo en la
dirección con la que inicia sesión. Sin `SMTP_*` configurado el aviso simplemente no se envía.
Requiere `SUPABASE_SERVICE_ROLE_KEY` (para leer el correo del socio).

**Segundo factor (TOTP).** Cada socio lo activa en `/panel/seguridad`. Requiere que MFA/TOTP esté
habilitado en Supabase → Authentication. Con él activo, el login pide el código; una sesión sin
verificar no entra al panel. Si un socio pierde su app, se quita el factor desde Supabase →
Authentication → Users.

## Firmas electrónicas (Fase 5)

Los clientes firman por un enlace sin cuenta; el servidor valida el token y sella
el PDF con `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API →
`service_role`). Esa clave:

- va **solo** en Netlify → Environment variables (y en `.env.local` para pruebas),
- **nunca** lleva el prefijo `NEXT_PUBLIC_` ni se pega en chats o documentos,
- salta RLS: el código la usa únicamente en `lib/supabase/admin.ts`.

Verificación pública de PDFs firmados: `/verificar`.
