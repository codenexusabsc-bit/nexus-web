"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stamp, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { saveMySignature } from "@/app/panel/firmas/actions";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

/** El socio dibuja su firma una vez (o elige el sello E) y queda guardada para todos sus documentos. */
export function MySignature({ userId, currentUrl, usesSello }: { userId: string; currentUrl: string | null; usesSello: boolean }) {
  const router = useRouter();
  const pad = useRef<SignaturePadHandle>(null);
  const [empty, setEmpty] = useState(true);
  const [pending, startTransition] = useTransition();

  const saveDrawn = () =>
    startTransition(async () => {
      const png = pad.current?.toPng();
      if (!png) return;
      const blob = await (await fetch(png)).blob();
      const path = `firmas/socios/${userId}/${crypto.randomUUID()}.png`;
      const { error } = await createClient().storage.from("archivos").upload(path, blob, { contentType: "image/png" });
      if (error) {
        toast.error("No se pudo subir la firma.");
        return;
      }
      const res = await saveMySignature(path);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Firma guardada.");
        pad.current?.clear();
        router.refresh();
      }
    });

  const useSello = () =>
    startTransition(async () => {
      const res = await saveMySignature("sello-e");
      if (res.error) toast.error(res.error);
      else {
        toast.success("Usarás el sello E como firma.");
        router.refresh();
      }
    });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4">
        <p className="text-sm font-semibold text-navy">Firma actual</p>
        <div className="flex h-44 items-center justify-center rounded-lg bg-bg">
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen privada servida con URL firmada
            <img src={currentUrl} alt="Tu firma guardada" className={`max-h-40 max-w-full object-contain ${usesSello ? "pixelated" : ""}`} />
          ) : (
            <p className="px-6 text-center text-sm text-muted">Todavía no tienes firma guardada. Dibújala o usa el sello E.</p>
          )}
        </div>
        <button type="button" onClick={useSello} disabled={pending} className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-navy hover:border-purple disabled:opacity-50">
          <Stamp size={15} /> Usar el sello E
        </button>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4">
        <p className="text-sm font-semibold text-navy">Dibujar una firma nueva</p>
        <SignaturePad ref={pad} onChange={setEmpty} />
        <button type="button" onClick={saveDrawn} disabled={pending || empty} className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-purple px-4 py-2 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">
          <Save size={15} /> Guardar esta firma
        </button>
      </div>
    </div>
  );
}
