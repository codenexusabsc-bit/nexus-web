import { Suspense } from "react";
import { FolderOpen, FilePen, PenLine, Megaphone, Globe, Receipt, Users, Palette } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

/** Módulos del plan, en el orden de las fases. Se activan a medida que se construyen. */
const MODULES = [
  { icon: FolderOpen, name: "Carpeta compartida", desc: "Archivos por proyecto y solicitudes de documentos", phase: 2 },
  { icon: Globe, name: "Sitio web", desc: "Editar la landing, servicios y contacto", phase: 3 },
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
  return <h1 className="text-2xl font-bold text-navy sm:text-3xl">Hola, {first}</h1>;
}

export default function PanelHome() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <Suspense fallback={<div className="h-9 w-48 animate-pulse rounded bg-border" />}>
          <Greeting />
        </Suspense>
        <p className="mt-1 text-muted">Este es el panel de Nexus Ingeniería. Los módulos se irán activando por fases.</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(({ icon: Icon, name, desc, phase }) => (
          <li key={name} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple/10 text-purple">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-navy">{name}</p>
              <p className="text-sm text-muted">{desc}</p>
              <p className="mt-1 font-pixel text-[0.65rem] text-violet">PRÓXIMAMENTE · FASE {phase}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
