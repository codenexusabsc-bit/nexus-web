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
