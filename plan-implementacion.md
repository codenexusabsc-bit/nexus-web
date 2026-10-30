# Plan de Implementación — Nexus Ingeniería (Plataforma web)
**Versión:** 1.1 · **Fecha:** 29 de octubre de 2026  
**Socios:** Sebastián Claros (Ing. electrónico) · Javier Bermúdez (Ing. en telecomunicaciones)

---

> [!IMPORTANT]
> Ninguna fase se ejecuta sin confirmación explícita de los socios. Se reutiliza el stack y los patrones ya probados en la plataforma de Bonett Asociados (`~/minuta-app`).

---

## Resumen

Una sola aplicación con dos caras:

| Cara | Quién la ve | Qué tiene |
|------|-------------|-----------|
| **Sitio público** | Cualquier persona | Landing de servicios, presentación descargable en PDF, formulario de contacto, botón de WhatsApp |
| **Panel privado** | Sebastián y Javier (usuario y contraseña) | Carpeta compartida por proyectos, editor de documentos con plantilla Nexus, firmas, generador de piezas para redes, edición de la landing, prospectos, cotizaciones y kit de marca |

Todo en planes gratuitos mientras no haya dominio propio. Dirección actual: **https://nexus-ingenieria1.netlify.app** (`nexus-ingenieria` ya estaba ocupado; el nombre se puede cambiar gratis en Netlify).

---

## Estado del proyecto

> Fase 0 verificada el 29/10/2026: repo privado `codenexusabsc-bit/nexus-web`, proyecto Supabase `sbwxeasekgyabgkgtykp` (East US), sitio público en Netlify con `/api/salud` → `{"supabase":"ok"}` y cabeceras de seguridad activas. Protección de visitantes de Netlify desactivada.
>
> Fase 1 verificada el 29/10/2026: migración `001` aplicada, registro público desactivado, usuarios de Sebastián y Álvaro creados con rol `partner`; Sebastián entró al panel en producción. Pendiente: SMTP propio para que el correo de recuperación llegue a cualquier socio (el SMTP por defecto de Supabase solo envía a miembros del equipo).

| Fase | Nombre | Estado |
|------|--------|--------|
| 0 | Cuentas, repo y proyecto base | ✅ Completada (29/10/2026) |
| 1 | Autenticación de los socios | ✅ Completada (29/10/2026) |
| 2.5 | Agenda: calendario con recordatorios y mensajes entre socios | 🔨 Migración aplicada, falta probar en el panel |
| 2 | Proyectos y carpeta compartida | 🔨 Migración aplicada (29/10/2026), falta probar en el panel |
| 3 | Landing pública editable + contacto | 🔨 Migración aplicada, falta probar en el panel |
| 4 | Editor de documentos con plantilla Nexus | 🔨 Migración aplicada, falta probar en el panel |
| 5 | Firmas (socios y clientes) | 🔨 Migración 006 y clave de servidor listas (29/10/2026), falta probar una firma real |
| 6 | Generador de piezas para redes | ⏳ Pendiente |
| 7 | Cotizaciones y cuentas de cobro | ⏳ Pendiente |
| 8 | Prospectos y tareas de proyecto | ⏳ Pendiente |
| 9 | Utilidades de marca | 🔸 Adelantado: panel desplegable de logos y sellos (sellos solo con sesión) |

---

## Usuarios y roles

| Rol | Quién | Acceso |
|-----|-------|--------|
| `partner` | Sebastián Claros (sebastianclaros009@gmail.com), Álvaro Javier Bermúdez (alvarojavierbr2000@gmail.com) | Total |
| `signer` (sin cuenta) | Clientes | Solo la página pública de firma, mediante enlace con token |

- Registro público **deshabilitado**. Los dos usuarios se crean a mano en Supabase (igual que en Bonett).
- Contraseña + opción de recuperación por correo. Se puede añadir segundo factor (TOTP) de Supabase sin costo en una fase posterior.

---

## Arquitectura

```
Navegador (HTTPS)
   │
   ├── Sitio público  /  /servicios  /presentacion  /contacto
   ├── Firma pública  /firmar/[token]   (cliente, sin cuenta)
   └── Panel privado  /panel/...        (socios, con sesión)
            │
   ┌────────▼─────────────────────────────┐
   │  NETLIFY — Next.js App Router         │
   │  TypeScript + Tailwind CSS            │
   │  Revalidación al editar la landing    │
   └────────┬─────────────────────────────┘
            │
   ┌────────┴──────────┐
   │                   │
Supabase JS        Edge Functions (service_role, nunca en el navegador)
(anon + JWT)           ├── crear/validar enlaces de firma
   │                   ├── sellar PDF firmado + certificado
   ▼                   └── Resend (avisos por correo)
PostgreSQL + RLS
Auth · Storage (carpeta compartida, PDFs, logos, piezas)
```

**Regla de oro (igual que Bonett):** el navegador nunca usa `service_role`; los archivos privados solo salen por URLs firmadas de vida corta.

**Cambio frente a Bonett:** se usa **Supabase Storage** (1 GB gratis, sin tarjeta) en lugar de Cloudflare R2. El volumen esperado (PDFs y PNG) cabe de sobra. Si crece, se migra a R2.

---

## Identidad visual y animaciones

- Fondo espacial animado reutilizable (`components/space/`): estrellas que titilan, estrellas fugaces, nebulosas y el agujero negro con planetas pixel en órbita (SVG). Solo CSS/SVG, sin JavaScript; se detiene con "reducir movimiento".
- Se usa en la landing, en las pantallas de acceso y en la cabecera del panel.
- Botón **Logos** en el panel: panel lateral con logos, publicidad y sellos para descargar. Los sellos de firma no están en `/public`: se sirven por `/panel/marca/[archivo]` solo con sesión de socio.

## Navegación y agenda

- **Menú lateral izquierdo** con todas las funciones agrupadas (Trabajo, Clientes, Documentos y marca); las que aún no existen aparecen atenuadas con su fase. En celular se despliega con el botón de menú.
- **Inicio = Agenda:** calendario al centro (mes, semana, lista) y columna de pendientes.
  - Recordatorios **para mí** (privados) o **compartidos** (los ven los dos).
  - **Mensajes al socio** con fecha: le aparecen en su calendario y en sus pendientes hasta que los lee.
  - Las **solicitudes de documentos** se ven solas: fecha límite de lo que me piden, entregas por revisar y lo que pedí.
  - Arrastrar para reprogramar; marcar hecho; mensajes sin leer resaltados.
- Pendientes: mensajes sin leer, entregas por revisar, documentos que me piden, recordatorios de hoy y atrasados, mensajes nuevos de la página.
- Tabla `agenda_items` (migración 004) con RLS: lo privado solo lo ve quien lo creó.

## Módulos

### 0. Carpeta compartida por proyectos
Un espacio común donde cualquiera de los dos socios deja archivos, y donde se **piden documentos** el uno al otro.

- **Proyectos como etiquetas:** cada archivo pertenece a un proyecto (por ejemplo *Bonett Asociados*, *Interno Nexus*, *Marca*) y puede llevar etiquetas extra (*contrato*, *factura*, *diseño*, *pendiente de revisar*). Cada proyecto tiene un color.
- **Vistas:** por proyecto, por etiqueta, "subido por mí / por mi socio" y "recientes". Buscador por nombre.
- **Subir:** arrastrar y soltar varios archivos a la vez (PDF, imágenes, Word, Excel, ZIP), con nota opcional. Descargar uno o la carpeta entera en ZIP.
- **Solicitudes de documentos:** un socio crea una solicitud ("Necesito el RUT de Bonett"), elige proyecto y fecha límite. El otro la ve en su inicio, sube el archivo **directamente en la solicitud** y queda marcada como entregada. Estados: pendiente → entregada → aceptada / devuelta con comentario.
- **Avisos:** contador de pendientes en el inicio del panel. El aviso por **correo** queda para cuando haya SMTP propio (Gmail de Nexus o dominio en Resend): sin dominio, Resend y el SMTP por defecto de Supabase solo entregan a la cuenta dueña.
- **Versiones:** subir un archivo con el mismo nombre en el mismo proyecto guarda una versión nueva sin borrar la anterior.
- **Papelera:** lo borrado se puede recuperar durante 30 días.
- Los documentos hechos en el editor y los PDF firmados aparecen también en la carpeta de su proyecto.

> [!NOTE]
> Supabase Free permite archivos de hasta **50 MB** y **1 GB** en total. Si la carpeta se acerca al límite, se mueve el almacenamiento a Cloudflare R2 (10 GB gratis, pide tarjeta) sin cambiar la forma de usarla.

### 1. Landing pública editable
- Secciones: portada con el portal y planetas, servicios (las 7 tarjetas), cómo trabajamos, equipo, por qué elegirnos, contacto.
- **Todo el texto, los servicios y los datos de contacto se guardan en la base de datos** y se editan desde `/panel/sitio` **por borrador**: guardar borrador → vista previa (`/panel/sitio/vista-previa`, solo socios) → publicar. Nada cambia en la página pública hasta publicar (migración 007, función `publish_site`).
- Botón "Descargar presentación": sirve el PDF de Presentación, que se genera con el mismo contenido (no hay dos versiones que mantener).
- Formulario de contacto → crea un prospecto y avisa por correo. Botón flotante de WhatsApp a 321 954 3616 / 320 322 6265.
- SEO básico: título, descripción, imagen para compartir (la promocional), `sitemap.xml`.

### 2. Editor de documentos (estilo Overleaf, modo visual)
- Pantalla dividida: **editor a la izquierda, PDF en vivo a la derecha** con la plantilla Nexus (encabezado oscuro con logo, títulos pixel, pie con página).
- Editor de texto enriquecido (TipTap): títulos, listas, tablas, imágenes, saltos de página, campos variables (`{cliente}`, `{fecha}`, `{valor}`).
- Plantillas iniciales: Presentación, Propuesta/Cotización, Contrato de servicios, Acta de entrega, Manual de uso, Cuenta de cobro.
- Versiones: cada guardado crea una versión; se puede comparar y restaurar.
- Exportar PDF y guardar en la biblioteca.

### 3. Firmas sin servicios externos
- **Socios:** firman dentro del panel con su firma dibujada (o el sello E). La firma se guarda una vez en su perfil.
- **Clientes:** se genera un enlace `/firmar/[token]` (vence en N días, un solo uso). El cliente ve el PDF, escribe su nombre y cédula, dibuja su firma y acepta.
- Al completar, el servidor:
  1. estampa las firmas en el PDF (`pdf-lib`),
  2. agrega una **página de certificado**: quién firmó, correo, fecha y hora, IP, navegador y huella SHA-256 del documento,
  3. bloquea el documento (cualquier cambio exige una firma nueva).
- Verificación pública: `/verificar` permite subir el PDF y comprobar que su huella coincide.

> [!NOTE]
> Esto es una **firma electrónica** con evidencias, reconocida en Colombia por la Ley 527 de 1999 y el Decreto 2364 de 2012 cuando el método es confiable. No es una **firma digital certificada** (esa requiere una entidad certificadora acreditada y tiene costo). Para contratos de alto valor conviene confirmarlo con un abogado; Bonett es buen contacto para eso.

### 4. Generador de piezas para redes
- Plantillas con los logos y el estilo pixel: post de Instagram (1080×1350), historia / estado de WhatsApp (1080×1920), portada de Facebook, foto de perfil.
- Se editan textos, servicios, colores de los planetas y la llamada a la acción; vista previa en vivo; descarga en PNG.
- Las piezas guardadas quedan en una galería para reutilizarlas.
- Base: la imagen promocional y la foto de WhatsApp que ya existen (`~/Escritorio/sellos`).

### 5. Utilidades adicionales propuestas
| Utilidad | Para qué sirve |
|----------|----------------|
| **Cotizaciones** | Ítems, valores y tiempos → PDF con plantilla → enlace para que el cliente la acepte firmando. Una cotización aceptada se convierte en proyecto. |
| **Cuentas de cobro** | Numeración consecutiva, PDF con plantilla, estado pagada / pendiente, total cobrado por mes. |
| **Prospectos (mini CRM)** | Los contactos de la landing llegan aquí con estado: nuevo, contactado, cotizado, ganado, perdido. Notas y próxima acción. |
| **Tareas de proyecto** | Sobre los proyectos de la carpeta compartida: estado, fechas, tablero tipo kanban, documentos y firmas asociados. Bonett queda como primer proyecto. |
| **Kit de marca** | Logos, sellos A–E, paleta y tipografías para descargar en un clic. |
| **Firma de correo** | Genera la firma HTML de Gmail para cada socio con logo y datos. |
| **Tarjeta digital con QR** | Página `/tarjeta/sebastian` y `/tarjeta/javier` con botón "Guardar contacto" (vCard) y QR para imprimir. |
| **Portafolio** | Proyectos destacados en la landing, editables desde el panel. |
| **Registro de actividad** | Quién creó, editó, firmó o envió cada cosa. |

---

## Modelo de datos (borrador)

| Tabla | Contenido principal |
|-------|---------------------|
| `profiles` | Socio: nombre, cargo, teléfono, firma guardada |
| `projects` | Nombre, cliente, color, estado |
| `files` | Proyecto, nombre, ruta en Storage, tamaño, tipo, subido por, nota, borrado (papelera) |
| `file_versions` | Versiones anteriores de un archivo |
| `tags` / `file_tags` | Etiquetas y su relación con archivos |
| `doc_requests` | Solicitud: quién pide, a quién, proyecto, descripción, fecha límite, estado, comentario, archivo entregado |
| `site_settings` | Textos de la landing, contacto, redes |
| `services` | Nombre, descripción, "ideal para", color, orden, visible |
| `documents` | Título, plantilla, contenido (JSON del editor), estado (borrador / en firma / firmado) |
| `document_versions` | Copia del contenido por cada guardado |
| `signature_requests` | Documento, token (hash), vence, estado |
| `signatures` | Firmante, imagen, fecha, IP, agente, huella del PDF |
| `social_pieces` | Plantilla, campos editados, PNG generado |
| `leads` | Nombre, contacto, mensaje, estado, notas |
| `quotes` / `quote_items` | Cotización y sus ítems |
| `collection_accounts` | Cuentas de cobro: número, cliente, valor, estado |
| `tasks` | Tareas de cada proyecto |
| `audit_log` | Registro de actividad |

RLS activa en todas las tablas: solo `partner` lee y escribe; el público solo accede por Edge Functions con token.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js (App Router), React, TypeScript — igual que Bonett |
| Estilos | Tailwind CSS + lucide-react + sonner |
| Editor | TipTap |
| Vista y exportación PDF | `@react-pdf/renderer` (plantilla Nexus en el navegador) |
| Firmas y sellado | `pdf-lib` + `signature_pad` |
| Piezas para redes | Canvas del navegador con los recursos pixel ya hechos |
| Formularios | zod |
| Auth / BD / Archivos | Supabase (Auth, PostgreSQL, RLS, Storage, Edge Functions) |
| Correo | Resend (dominio `@resend.dev` hasta tener dominio propio) |
| Hosting | Netlify conectado a GitHub, `@netlify/plugin-nextjs` |

---

## Límites de los servicios gratuitos

> [!WARNING]
> Los límites cambian; verificar en Fase 0.

| Servicio | Punto a vigilar |
|----------|-----------------|
| **Supabase Free** | Máximo **2 proyectos activos** por cuenta (Bonett ya usa uno). Se **pausa tras ~7 días sin actividad**: el uso diario del panel lo evita. 500 MB de BD, 1 GB de Storage. |
| **Netlify Free** | Límite mensual de ancho de banda y minutos de build; suficiente para este tráfico. |
| **Resend Free** | 100 correos/día, 3 000/mes. |
| **GitHub** | Repositorio privado gratis. |

---

## Fases detalladas

### Fase 0 — Cuentas, repo y proyecto base
- **Todas las cuentas son nuevas y a nombre de `codenexus.absc@gmail.com`** (decidido el 29/10/2026): GitHub, Supabase, Netlify y Resend. No se reutiliza nada de Bonett.
- Repo privado `nexus-web` en la cuenta GitHub de Nexus; proyecto Next.js con la misma base que Bonett.
- Proyecto Supabase en la cuenta de Nexus.
- Sitio en Netlify y verificación del subdominio.
- En esta máquina el git global está a nombre de Bonett: el repo `nexus-web` lleva `user.name` / `user.email` locales de Nexus.
- **Listo cuando:** la página "hola" está publicada en Netlify y conectada a Supabase.

### Fase 1 — Autenticación
- Inicio de sesión, cierre, recuperación de contraseña, rutas `/panel/*` protegidas.
- Crear los usuarios de Sebastián y Javier.
- **Listo cuando:** ambos entran con su usuario y nadie más puede registrarse.

### Fase 2 — Proyectos y carpeta compartida
- Proyectos con color, archivos con etiquetas, subida múltiple, descarga ZIP, versiones y papelera.
- Solicitudes de documentos entre socios con estados y aviso por correo.
- **Listo cuando:** Sebastián pide un documento a Javier, Javier lo sube desde la solicitud, a Sebastián le llega el aviso y el archivo aparece en la carpeta del proyecto.

### Fase 3 — Landing editable + contacto
- Landing con el estilo pixel espacial del PDF de Presentación; contenido desde la BD.
- `/panel/sitio` para editar textos, servicios y contacto.
- `/presentacion` genera el PDF con ese contenido.
- Formulario de contacto + botón de WhatsApp.
- **Listo cuando:** un cambio hecho en el panel aparece en la página pública sin volver a desplegar.

### Fase 4 — Editor de documentos
- Editor + vista PDF en vivo, plantillas, variables, versiones, biblioteca.
- **Listo cuando:** se puede recrear la Presentación y el Manual de Bonett desde el editor.

### Fase 5 — Firmas
- Firma de socios, enlaces de firma para clientes, sellado, certificado y `/verificar`.
- **Listo cuando:** un documento pasa por borrador → firma de un socio → firma del cliente desde el celular → PDF final con certificado.

### Fase 6 — Generador de piezas para redes
- Plantillas de post, historia, portada y perfil; edición y descarga PNG; galería.
- **Listo cuando:** se puede recrear la imagen promocional actual y descargar una historia de WhatsApp.

### Fase 7 — Cotizaciones y cuentas de cobro
- Cotización → enlace de aceptación con firma → proyecto. Cuentas de cobro numeradas.

### Fase 8 — Prospectos y tareas de proyecto
- Tablero de prospectos desde la landing; tareas tipo kanban dentro de cada proyecto.

### Fase 9 — Utilidades de marca
- Kit de marca, firma de correo, tarjetas digitales con QR, portafolio.

### Después — Dominio propio
- Comprar el dominio (por ejemplo `nexusingenieria.co` o `.com`), conectarlo en Netlify, verificarlo en Resend para enviar desde `@nexusingenieria…`, y crear correos de dominio.

---

## Preguntas abiertas

1. Para cuentas de cobro: ¿a nombre de quién se emiten y con qué datos (cédula / RUT)?
2. ¿Qué número de WhatsApp va en el botón flotante de la landing?
