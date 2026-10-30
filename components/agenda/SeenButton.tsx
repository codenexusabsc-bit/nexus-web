"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { markMessageSeen, setAgendaDone } from "@/app/panel/agenda-actions";

/** Botón compacto para marcar un mensaje como leído o un recordatorio como hecho. */
export function QuickCheck({ id, action, label }: { id: string; action: "leido" | "hecho"; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = action === "leido" ? await markMessageSeen(id) : await setAgendaDone(id, true);
          if (res.error) toast.error(res.error);
        })
      }
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-white px-2 py-1 text-xs text-navy transition hover:border-teal hover:text-teal-700 disabled:opacity-50"
    >
      <Check size={12} /> {label}
    </button>
  );
}
