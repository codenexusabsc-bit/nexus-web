-- ============================================================
-- NEXUS INGENIERÍA — Plataforma web
-- 003 — Sitio público editable: contenido, servicios y mensajes
--       del formulario de contacto
-- ============================================================

-- ---- Contenido de la landing (una sola fila) -----------------
-- El contenido va en jsonb; su forma la valida la app (lib/sitio.ts).
create table public.site_settings (
  id          boolean primary key default true check (id),
  content     jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);

-- ---- Servicios ----------------------------------------------
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 400),
  ideal_for   text not null default '' check (char_length(ideal_for) <= 200),
  color       text not null default '#9333EA' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position    integer not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---- Mensajes del formulario de contacto (prospectos) --------
create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null default '' check (char_length(email) <= 200),
  phone       text not null default '' check (char_length(phone) <= 40),
  company     text not null default '' check (char_length(company) <= 120),
  service     text not null default '' check (char_length(service) <= 80),
  message     text not null check (char_length(message) between 1 and 3000),
  status      text not null default 'nuevo'
              check (status in ('nuevo', 'contactado', 'cotizado', 'ganado', 'perdido')),
  created_at  timestamptz not null default now(),
  check (email <> '' or phone <> '')   -- al menos una forma de contacto
);

create index leads_created_idx on public.leads (created_at desc);

-- ---- Row Level Security -------------------------------------
alter table public.site_settings enable row level security;
alter table public.services      enable row level security;
alter table public.leads         enable row level security;

-- Público: lee el contenido y los servicios visibles.
create policy "site_settings: lectura pública" on public.site_settings for select
  to anon, authenticated using (true);
create policy "site_settings: socios editan" on public.site_settings for update
  to authenticated using ((select public.is_partner())) with check ((select public.is_partner()));

-- Políticas separadas: anon no puede ejecutar is_partner(), así que no debe aparecer en la suya.
create policy "services: lectura pública de visibles" on public.services for select
  to anon using (visible);
create policy "services: lectura con sesión" on public.services for select
  to authenticated using (visible or (select public.is_partner()));
create policy "services: socios gestionan" on public.services for all
  to authenticated using ((select public.is_partner())) with check ((select public.is_partner()));

-- Público: solo puede enviar mensajes (nunca leerlos). Siempre entran como 'nuevo'.
create policy "leads: enviar desde la web" on public.leads for insert
  to anon, authenticated with check (status = 'nuevo');
create policy "leads: socios leen" on public.leads for select
  to authenticated using ((select public.is_partner()));
create policy "leads: socios actualizan" on public.leads for update
  to authenticated using ((select public.is_partner())) with check ((select public.is_partner()));
create policy "leads: socios borran" on public.leads for delete
  to authenticated using ((select public.is_partner()));

revoke all on public.site_settings, public.services, public.leads from anon;
grant select on public.site_settings, public.services to anon;
grant insert (name, email, phone, company, service, message) on public.leads to anon;
grant select, update on public.site_settings to authenticated;
grant select, insert, update, delete on public.services, public.leads to authenticated;

-- ---- Contenido inicial (el de la Presentación) ---------------
insert into public.site_settings (content) values ($json$
{
  "hero": {
    "title": "Construimos su mundo digital",
    "subtitle": "Páginas web, software a la medida, branding y redes para negocios que quieren crecer en digital, con dos ingenieros a cargo de cada proyecto de principio a fin.",
    "cta": "Primera consulta sin costo"
  },
  "about": {
    "title": "Quiénes somos",
    "body": "Somos una empresa de ingeniería que une la electrónica, las telecomunicaciones y el desarrollo de software. Convertimos la idea de cada cliente en una herramienta digital que funciona, se ve bien y es fácil de usar.\n\nTrabajamos directo con usted, sin intermediarios: quien le escucha es quien construye. Cada proyecto se entrega con capacitación y un manual de uso."
  },
  "steps": [
    { "title": "Reunión inicial", "text": "Conocemos su negocio, sus necesidades y su presupuesto." },
    { "title": "Propuesta", "text": "Le enviamos alcance, cronograma y precio por escrito." },
    { "title": "Diseño", "text": "Le mostramos cómo se verá y ajustamos hasta que le guste." },
    { "title": "Desarrollo y pruebas", "text": "Construimos y probamos en computador y celular." },
    { "title": "Entrega", "text": "Publicamos, le capacitamos y le dejamos un manual." }
  ],
  "team": [
    { "name": "Sebastián Claros", "title": "Ingeniero electrónico", "text": "Desarrollo de software y páginas web, automatización e integración de sistemas y dispositivos." },
    { "name": "Álvaro Javier Bermúdez", "title": "Ingeniero en telecomunicaciones", "text": "Redes y conectividad, infraestructura en la nube, hosting y seguridad." }
  ],
  "values": [
    { "title": "Ingeniería real", "text": "Software, hardware y redes bajo un mismo equipo." },
    { "title": "Todo a la medida", "text": "Cada solución parte de cómo trabaja usted." },
    { "title": "Entrega completa", "text": "Capacitación, manual y acompañamiento." },
    { "title": "Trato directo", "text": "Siempre habla con quien construye su proyecto." }
  ],
  "contact": {
    "email": "codenexus.absc@gmail.com",
    "phones": ["321 954 3616", "320 322 6265"],
    "whatsapp": "573219543616",
    "city": "Colombia"
  }
}
$json$::jsonb);

insert into public.services (name, description, ideal_for, color, position) values
  ('Páginas web', 'Sitio corporativo o landing page adaptado a celular, con dominio, hosting y formulario de contacto.', 'Empresas y profesionales que necesitan presencia en internet.', '#9333EA', 1),
  ('Software personalizado', 'Paneles, sistemas de gestión y plataformas a la medida: clientes, citas, documentos, inventario.', 'Negocios con procesos propios que una app genérica no resuelve.', '#6366F1', 2),
  ('Branding', 'Logo, paleta de colores, tipografía, sellos y manual de marca.', 'Empresas nuevas o que quieren renovar su imagen.', '#F472B6', 3),
  ('Tiendas en línea', 'Catálogo, carrito de compras, pagos en línea y gestión de pedidos.', 'Comercios que quieren vender por internet.', '#FB923C', 4),
  ('Automatización', 'Conexión con WhatsApp, correo, calendarios y formularios; reportes automáticos.', 'Equipos que pierden tiempo en tareas repetitivas.', '#2DD4BF', 5),
  ('Redes y telecomunicaciones', 'Diseño e instalación de redes Wi-Fi y cableado, configuración de equipos y cámaras IP.', 'Oficinas, locales y conjuntos residenciales.', '#67E8F9', 6),
  ('Soporte y mantenimiento', 'Actualizaciones, copias de seguridad, seguridad del sitio y atención a incidencias.', 'Clientes que quieren su plataforma siempre funcionando.', '#C04CF5', 7);
