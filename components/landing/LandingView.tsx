import Image from "next/image";
import { ArrowDown, FileDown, Mail, MessageCircle, Phone } from "lucide-react";
import { whatsappUrl, type Service, type SiteContent } from "@/lib/sitio-shared";
import { SpaceBackground } from "@/components/space/SpaceBackground";
import { OrbitingPortal } from "@/components/space/OrbitingPortal";
import { LandingNav } from "@/components/landing/LandingNav";
import { Reveal } from "@/components/landing/Reveal";
import { ContactForm } from "@/components/landing/ContactForm";

/**
 * Cuerpo de la landing. Lo usa la página pública (contenido publicado) y la
 * vista previa del panel (borrador sin publicar).
 */
export function LandingView({ content, services, preview = false }: { content: SiteContent; services: Service[]; preview?: boolean }) {
  const { hero, about, steps, team, values, contact } = content;
  const wa = whatsappUrl(contact.whatsapp);
  const visible = services.filter((s) => s.visible);

  return (
    <div className="bg-navy text-white">
      <LandingNav />

      {/* ---- Portada ---- */}
      <section className="relative flex min-h-dvh items-center overflow-hidden pt-20">
        <SpaceBackground stars={160} shooting={7} seed={21} />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-8 md:grid-cols-2">
          <div className="flex flex-col gap-6 text-center md:text-left">
            <p className="rise font-pixel text-sm tracking-[0.35em] text-cyan">NEXUS INGENIERÍA</p>
            <h1 className="rise rise-1 text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
              {hero.title}
            </h1>
            <p className="rise rise-2 text-lg text-white/75">{hero.subtitle}</p>
            <div className="rise rise-3 flex flex-wrap justify-center gap-3 md:justify-start">
              <a href={wa} target="_blank" rel="noopener noreferrer" className="shine inline-flex items-center gap-2 rounded-lg bg-violet px-5 py-3 font-semibold transition hover:bg-orchid">
                <MessageCircle size={18} aria-hidden="true" /> {hero.cta}
              </a>
              <a href="#servicios" className="inline-flex items-center gap-2 rounded-lg border border-white/25 px-5 py-3 font-semibold transition hover:border-cyan hover:text-cyan">
                Ver servicios
              </a>
            </div>
          </div>
          <div className="rise rise-2 mx-auto w-full max-w-md">
            <OrbitingPortal />
          </div>
        </div>
        <a href="#servicios" className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-white/60 motion-reduce:animate-none" aria-label="Bajar a servicios">
          <ArrowDown size={22} />
        </a>
      </section>

      {/* ---- Servicios ---- */}
      <section id="servicios" className="relative scroll-mt-16 bg-bg py-20 text-text">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <Reveal>
            <SectionTitle kicker="SERVICIOS" title="Lo que construimos" dark={false} />
          </Reveal>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s, i) => (
              <li key={s.id}>
                <Reveal delay={(i % 3) * 90} className="h-full">
                  <article className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple/10">
                    <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: s.color }} aria-hidden="true" />
                    <span
                      className="size-10 rounded-full transition duration-500 group-hover:scale-110 group-hover:rotate-12"
                      style={{ background: `radial-gradient(circle at 30% 30%, #fff 0 12%, ${s.color} 13% 70%, color-mix(in srgb, ${s.color} 60%, #0E0A26) 71%)`, boxShadow: `0 0 24px ${s.color}55` }}
                      aria-hidden="true"
                    />
                    <h3 className="text-lg font-bold text-navy">{s.name}</h3>
                    <p className="flex-1 text-sm text-muted">{s.description}</p>
                    {s.idealFor && (
                      <p className="text-xs text-purple">
                        <b>Ideal para:</b> {s.idealFor}
                      </p>
                    )}
                  </article>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Nosotros ---- */}
      <section id="nosotros" className="relative scroll-mt-16 overflow-hidden py-20">
        <SpaceBackground stars={70} shooting={3} seed={33} />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-8 md:grid-cols-2">
          <Reveal>
            <SectionTitle kicker="NOSOTROS" title={about.title} />
            {about.body.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="mt-4 text-white/75">
                {p}
              </p>
            ))}
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {values.map((v) => (
                <li key={v.title} className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-cyan/40">
                  <p className="font-semibold text-cyan">{v.title}</p>
                  <p className="text-sm text-white/70">{v.text}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <div className="flex flex-col gap-4">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 120}>
                <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-violet/50">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-deep font-pixel text-lg">
                    {m.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}
                  </span>
                  <div>
                    <p className="text-lg font-bold">{m.name}</p>
                    <p className="text-sm text-cyan">{m.title}</p>
                    <p className="mt-1 text-sm text-white/70">{m.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Proceso ---- */}
      <section id="proceso" className="scroll-mt-16 bg-bg py-20 text-text">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <Reveal>
            <SectionTitle kicker="CÓMO TRABAJAMOS" title={`${steps.length} pasos, usted aprueba cada uno`} dark={false} />
          </Reveal>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-5">
            <span className="absolute top-6 right-[10%] left-[10%] hidden border-t-2 border-dashed border-orchid/50 md:block" aria-hidden="true" />
            {steps.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 110} className="relative flex flex-col items-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-navy font-pixel text-lg text-white shadow-lg shadow-purple/30 ring-4 ring-bg">
                    {i + 1}
                  </span>
                  <p className="font-bold text-navy">{s.title}</p>
                  <p className="text-sm text-muted">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- Contacto ---- */}
      <section id="contacto" className="relative scroll-mt-16 overflow-hidden py-20">
        <SpaceBackground stars={90} shooting={4} seed={45} />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-8 md:grid-cols-2">
          <Reveal>
            <SectionTitle kicker="CONTACTO" title="Hablemos de su proyecto" />
            <p className="mt-4 text-white/75">
              La <b className="text-cyan">primera consulta es sin costo</b>: le escuchamos y le enviamos una propuesta con tiempos y precio.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-3 hover:text-cyan">
                    <Mail size={18} className="text-cyan" aria-hidden="true" /> {contact.email}
                  </a>
                </li>
              )}
              {contact.phones.map((p) => (
                <li key={p}>
                  <a href={`tel:+57${p.replace(/\D/g, "")}`} className="inline-flex items-center gap-3 hover:text-cyan">
                    <Phone size={18} className="text-cyan" aria-hidden="true" /> {p}
                  </a>
                </li>
              ))}
              <li>
                <a href="/presentacion" className="inline-flex items-center gap-3 hover:text-cyan">
                  <FileDown size={18} className="text-cyan" aria-hidden="true" /> Descargar nuestra presentación (PDF)
                </a>
              </li>
            </ul>
          </Reveal>
          <Reveal delay={120}>
            {preview ? <p className="rounded-2xl border border-white/15 bg-white/5 p-6 text-white/70">Aquí va el formulario de contacto (desactivado en la vista previa).</p> : <ContactForm services={visible.map((s) => s.name)} />}
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-white/60 sm:px-8">
          <span className="flex items-center gap-2">
            <Image src="/marca/portal.png" alt="" width={248} height={327} unoptimized className="pixelated h-auto w-5" />
            Nexus Ingeniería · {contact.city}
          </span>
          <a href="/login" className="hover:text-cyan">Acceso socios</a>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp */}
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className="fixed right-5 bottom-5 z-30 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/30 transition hover:scale-110"
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/40 motion-reduce:animate-none" aria-hidden="true" />
        <MessageCircle size={26} className="relative" />
      </a>
    </div>
  );
}

function SectionTitle({ kicker, title, dark = true }: { kicker: string; title: string; dark?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-2 font-pixel text-xs tracking-[0.3em] text-orchid">
        <span className="h-0.5 w-6 bg-cyan" aria-hidden="true" />
        {kicker}
      </p>
      <h2 className={`mt-3 text-3xl font-bold sm:text-4xl ${dark ? "text-white" : "text-navy"}`}>{title}</h2>
    </div>
  );
}
