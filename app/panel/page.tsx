import { Suspense } from "react";
import Link from "next/link";
import { FolderOpen, FilePen, PenLine, Megaphone, Globe, Receipt, Users, Palette, Inbox } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { requestCounts } from "@/lib/carpeta";
import { createClient } from "@/lib/supabase/server";

/** Módulos del plan, en el orden de las fases. Los que tienen href ya están activos. */
const MODULES = [
  { icon: FolderOpen, name: "Carpeta compartida", desc: "Archivos por proyecto, versiones y papelera", phase: 2, href: "/panel/carpeta" },
  { icon: Inbox, name: "Solicitudes", desc: "Pedir y entregar documentos entre socios", phase: 2, href: "/panel/solicitudes" },
  { icon: Globe, name: "Sitio web", desc: "Editar la landing, servicios y ver mensajes", phase: 3, href: "/panel/sitio" },
  { icon: FilePen, name: "Documentos", desc: "Editor con la plantilla Nexus y vista PDF", phase: 4 },
  { icon: PenLine, name: "Firmas", desc: "Firmar y enviar a firmar a clientes", phase: 5 },
  { icon: Megaphone, name: "Piezas para redes", desc: "Posts, historias y portadas con la marca", phase: 6 },
  { icon: Receipt, name: "Cotizaciones y cobros", desc: "Propuestas aceptadas con firma y cuentas de cobro", phase: 7 },
  { icon: Users, name: "Prospectos", desc: "Contactos de la landing y tareas de proyecto", phase: 8 },
  { icon: Palette, name: "Kit de marca", desc: "Logos, sellos, firma de correo y tarjetas", phase: 9 },
];

async function Greeting() {
  const user = await getCurrentUser();
  const first = (user.fullName || user.email).split(/[\s@]/)[0];
  const supabase = await createClient();
  const [counts, { count: newLeads }] = await Promise.all([
    requestCounts(user.id),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "nuevo"),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-navy sm:text-3xl">Hola, {first}</h1>
      {(counts.toMe > 0 || counts.toReview > 0 || (newLeads ?? 0) > 0) && (
        <div className="flex flex-wrap gap-3">
          {counts.toMe > 0 && (
            <Link href="/panel/solicitudes" className="rounded-xl border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-navy hover:border-orange">
              <b>{counts.toMe}</b> {counts.toMe === 1 ? "documento te piden" : "documentos te piden"}
            </Link>
          )}
          {(newLeads ?? 0) > 0 && (
            <Link href="/panel/sitio#mensajes" className="rounded-xl border border-violet/40 bg-violet/10 px-4 py-3 text-sm text-navy hover:border-violet">
              <b>{newLeads}</b> {newLeads === 1 ? "mensaje nuevo de la página" : "mensajes nuevos de la página"}
            </Link>
          )}
          {counts.toReview > 0 && (
            <Link href="/panel/solicitudes" className="rounded-xl border border-cyan/60 bg-cyan/10 px-4 py-3 text-sm text-navy hover:border-cyan">
              <b>{counts.toReview}</b> {counts.toReview === 1 ? "entrega por revisar" : "entregas por revisar"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function PanelHome() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Suspense fallback={<div className="h-9 w-48 animate-pulse rounded bg-border" />}>
          <Greeting />
        </Suspense>
        <p className="mt-2 text-muted">Este es el panel de Nexus Ingeniería. Los módulos se irán activando por fases.</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ icon: Icon, name, desc, phase, href }) => {
          const body = (
            <>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${href ? "bg-purple text-white" : "bg-purple/10 text-purple"}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-navy">{name}</p>
                <p className="text-sm text-muted">{desc}</p>
                {!href && <p className="mt-1 font-pixel text-[0.65rem] text-violet">PRÓXIMAMENTE · FASE {phase}</p>}
              </div>
            </>
          );
          return (
            <li key={name}>
              {href ? (
                <Link href={href} className="flex h-full gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-purple hover:shadow-sm">
                  {body}
                </Link>
              ) : (
                <div className="flex h-full gap-3 rounded-xl border border-border bg-surface p-4 opacity-75">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
