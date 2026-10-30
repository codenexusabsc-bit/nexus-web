"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteDocument } from "@/app/panel/documentos/actions";

export function DeleteDocButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Borrar este documento y todas sus versiones? No se puede deshacer.")) return;
        startTransition(async () => {
          const res = await deleteDocument(id);
          if (res.error) toast.error(res.error);
          else {
            toast.success("Documento borrado.");
            router.push("/panel/documentos");
          }
        });
      }}
      className="inline-flex items-center gap-1.5 text-muted hover:text-red-600"
    >
      <Trash2 size={15} /> Borrar documento
    </button>
  );
}
