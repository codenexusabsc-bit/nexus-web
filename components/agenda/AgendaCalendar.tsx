"use client";

import { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import type { DateSelectArg, EventChangeArg, EventClickArg, EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { BellPlus, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIES, type CalendarEntry } from "@/lib/agenda";
import { addDays, bogotaNowAsUtc, toBogotaWall } from "@/lib/dates";
import type { Partner } from "@/lib/carpeta";
import { moveAgendaItem } from "@/app/panel/agenda-actions";
import { AgendaModal, draftFromEntry, type Draft } from "./AgendaModal";

/** Con timeZone "UTC", los Date de FullCalendar llevan la hora de pared de Colombia. */
const wall = (date: Date) => date.toISOString().slice(0, 19);

function newDraft(type: Draft["type"], partners: Partner[], userId: string, date?: string): Draft {
  return {
    type,
    recipient: type === "mensaje" ? partners.find((p) => p.id !== userId)?.id : undefined,
    title: "",
    notes: "",
    allDay: false,
    date: date ?? toBogotaWall(new Date()).slice(0, 10),
    endDate: "",
    startTime: "09:00",
    endTime: "",
  };
}

interface ModalState {
  key: number;
  entry: CalendarEntry | null;
  draft: Draft;
}

/** Calendario central de la agenda: recordatorios, mensajes entre socios y solicitudes. */
export function AgendaCalendar({ partners, userId, names }: { partners: Partner[]; userId: string; names: Record<string, string> }) {
  const router = useRouter();
  const ref = useRef<FullCalendar>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [loadError, setLoadError] = useState(false);

  const open = (entry: CalendarEntry | null, draft: Draft) => setModal((m) => ({ key: (m?.key ?? 0) + 1, entry, draft }));
  const refresh = useCallback(() => {
    ref.current?.getApi().refetchEvents();
    router.refresh(); // actualiza la lista de pendientes
  }, [router]);

  const fetchEvents = useCallback(async (info: EventSourceFuncArg, ok: (e: EventInput[]) => void, fail: (e: Error) => void) => {
    try {
      const params = new URLSearchParams({ start: info.startStr, end: info.endStr });
      const res = await fetch(`/api/agenda?${params}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      setLoadError(false);
      ok(await res.json());
    } catch (e) {
      setLoadError(true);
      fail(e as Error);
    }
  }, []);

  function onSelect(info: DateSelectArg) {
    info.view.calendar.unselect();
    const day = wall(info.start).slice(0, 10);
    const d = newDraft("privado", partners, userId, day);
    if (info.allDay) {
      const last = addDays(wall(info.end).slice(0, 10), -1);
      open(null, { ...d, allDay: last > day, startTime: last > day ? "" : "09:00", endDate: last > day ? last : "" });
    } else {
      open(null, { ...d, startTime: wall(info.start).slice(11, 16), endTime: wall(info.end).slice(11, 16) });
    }
  }

  function onClick(info: EventClickArg) {
    info.jsEvent.preventDefault();
    const entry = info.event.extendedProps.entry as CalendarEntry;
    open(entry, draftFromEntry(entry) ?? newDraft("privado", partners, userId));
  }

  async function onChange(info: EventChangeArg) {
    const e = info.event;
    if (!e.start) return info.revert();
    const res = await moveAgendaItem(e.id, wall(e.start), e.end ? wall(e.end) : null, e.allDay);
    if (res.error) {
      info.revert();
      toast.error(res.error);
    } else {
      toast.success("Reprogramado.");
      refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted" aria-label="Colores del calendario">
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <li key={k} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} aria-hidden="true" />
              {c.label}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button type="button" onClick={() => open(null, newDraft("privado", partners, userId))} className="inline-flex items-center gap-1.5 rounded-lg bg-purple px-3 py-2 text-sm font-semibold text-white hover:bg-violet">
            <BellPlus size={16} /> Recordatorio
          </button>
          {partners.some((p) => p.id !== userId) && (
            <button type="button" onClick={() => open(null, newDraft("mensaje", partners, userId))} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-navy hover:border-purple">
              <MessageSquarePlus size={16} /> Mensaje a mi socio
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo cargar la agenda. Si es la primera vez, falta aplicar la migración 004 en Supabase.
        </p>
      )}

      <div className="agenda-calendar rounded-2xl border border-border bg-white p-3 sm:p-4">
        <FullCalendar
          ref={ref}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={esLocale}
          timeZone="UTC"
          now={bogotaNowAsUtc}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,listWeek" }}
          buttonText={{ list: "Lista" }}
          height="auto"
          events={fetchEvents}
          selectable
          selectMirror
          editable
          dayMaxEvents={3}
          nowIndicator
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          scrollTime="08:00:00"
          allDayText="Todo el día"
          noEventsText="Nada agendado esta semana"
          select={onSelect}
          eventClick={onClick}
          eventChange={onChange}
        />
      </div>

      {modal && (
        <AgendaModal
          key={modal.key}
          entry={modal.entry}
          draft={modal.draft}
          partners={partners}
          userId={userId}
          names={names}
          onClose={() => setModal(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
