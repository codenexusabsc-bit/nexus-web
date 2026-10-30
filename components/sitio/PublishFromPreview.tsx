"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { toast } from "sonner";
import { publishCurrentDraft } from "@/app/panel/sitio/actions";

export function PublishFromPreview() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        confirm("¿Publicar este borrador? La página pública cambiará para todos.") &&
        startTransition(async () => {
          const res = await publishCurrentDraft();
          if (res.error) toast.error(res.error);
          else {
            toast.success("¡Publicado!");
            router.push("/panel/sitio");
          }
        })
      }
      className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 font-semibold text-white disabled:opacity-50"
    >
      <Rocket size={15} /> {pending ? "Publicando…" : "Publicar"}
    </button>
  );
}
