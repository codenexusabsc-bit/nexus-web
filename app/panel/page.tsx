import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { listPartners } from "@/lib/carpeta";
import { firstName } from "@/lib/format";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { PendingList } from "@/components/agenda/PendingList";

export const metadata: Metadata = { title: "Agenda" };

/** Inicio del panel: calendario al centro y pendientes al lado. */
export default function PanelHome() {
  return (
    <Suspense fallback={<div className="h-[70dvh] animate-pulse rounded-2xl bg-border/50" />}>
      <Agenda />
    </Suspense>
  );
}

async function Agenda() {
  const user = await getCurrentUser();
  const partners = await listPartners();
  const names = Object.fromEntries(partners.map((p) => [p.id, firstName(p.fullName)]));
  const first = firstName(user.fullName || user.email);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">Hola, {first}</h1>
        <p className="text-muted">Toca un día del calendario para agendar un recordatorio o enviarle un mensaje a tu socio.</p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AgendaCalendar partners={partners} userId={user.id} names={names} />
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-border/50" />}>
          <PendingList userId={user.id} />
        </Suspense>
      </div>
    </div>
  );
}
