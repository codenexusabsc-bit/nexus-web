"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FolderUp, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { registerUpload } from "@/app/panel/carpeta/actions";
import { FORMATS, drawPiece, loadImage, type Assets, type FormatId, type PieceData } from "./draw";

const ACCENTS = ["#9333EA", "#6D28D9", "#0891B2", "#0F766E", "#EA580C", "#DB2777"];

const PRESETS: { name: string; data: Partial<PieceData> }[] = [
  {
    name: "Servicios",
    data: { kicker: "", title: "Construimos su mundo digital", subtitle: "", items: "Páginas web\nSoftware a la medida\nBranding\nTiendas en línea\nAutomatización\nRedes y telecom", cta: "Primera consulta sin costo" },
  },
  {
    name: "Promoción",
    data: { kicker: "Oferta del mes", title: "Su página web lista en 2 semanas", subtitle: "Diseño a la medida, adaptada a celular, con dominio y hosting el primer año.", items: "", cta: "Escríbanos hoy" },
  },
  {
    name: "Proyecto entregado",
    data: { kicker: "Proyecto entregado", title: "Panel del despacho para Bonett Asociados", subtitle: "Clientes, casos, agenda y documentos en un solo lugar, desde el computador o el celular.", items: "", cta: "¿Quiere uno así?" },
  },
  {
    name: "Consejo",
    data: { kicker: "Consejo Nexus", title: "¿Su negocio aparece en Google?", subtitle: "Una página propia y una ficha de Google Maps le traen clientes mientras usted trabaja.", items: "", cta: "Le ayudamos" },
  },
];

/** Generador de piezas: se editan los textos, se ve al instante y se descarga en PNG. */
export function PieceGenerator({ contact, projects }: { contact: string; projects: { id: string; name: string }[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [busy, setBusy] = useState(false);
  const [projectId, setProjectId] = useState(projects.find((p) => p.name === "Marca")?.id ?? projects[0]?.id ?? "");
  const [d, setD] = useState<PieceData>({
    format: "post",
    theme: "oscuro",
    accent: ACCENTS[0],
    planets: true,
    seed: 7,
    contact,
    kicker: "",
    title: "",
    subtitle: "",
    items: "",
    cta: "",
    ...PRESETS[0].data,
  });

  // Carga las imágenes y las fuentes de la marca una sola vez
  useEffect(() => {
    let alive = true;
    (async () => {
      const probe = document.createElement("span");
      probe.className = "font-pixel";
      document.body.appendChild(probe);
      const pixel = getComputedStyle(probe).fontFamily;
      probe.remove();
      const sans = getComputedStyle(document.body).fontFamily;
      await Promise.all([document.fonts.load(`700 40px ${pixel}`), document.fonts.load(`700 40px ${sans}`), document.fonts.load(`400 40px ${sans}`)]);
      const [portal, ...planets] = await Promise.all(
        ["/marca/portal.png", "/marca/planetas/teal.png", "/marca/planetas/naranja.png", "/marca/planetas/rosa.png", "/marca/planetas/cian.png"].map(loadImage)
      );
      if (alive) setAssets({ portal, planets, sans, pixel });
    })().catch(() => toast.error("No se pudieron cargar las imágenes de la marca."));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (assets && canvas.current) drawPiece(canvas.current, d, assets);
  }, [d, assets]);

  const set = <K extends keyof PieceData>(k: K, v: PieceData[K]) => setD((p) => ({ ...p, [k]: v }));
  const fileName = () => `nexus-${d.format}-${(d.title || "pieza").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png`;
  const toBlob = () => new Promise<Blob>((ok, fail) => canvas.current!.toBlob((b) => (b ? ok(b) : fail()), "image/png"));

  async function download() {
    const blob = await toBlob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveToFolder() {
    if (!projectId) return toast.error("Elige un proyecto.");
    setBusy(true);
    try {
      const blob = await toBlob();
      const path = `${projectId}/${crypto.randomUUID()}`;
      const { error } = await createClient().storage.from("archivos").upload(path, blob, { contentType: "image/png" });
      if (error) throw error;
      const res = await registerUpload({ projectId, name: fileName(), path, size: blob.size, mime: "image/png", note: `Pieza para redes · ${FORMATS[d.format].label}` });
      if (res.error) throw new Error(res.error);
      toast.success("Guardada en la carpeta compartida.");
    } catch {
      toast.error("No se pudo guardar en la carpeta.");
    } finally {
      setBusy(false);
    }
  }

  const input = "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-purple";
  const fmt = FORMATS[d.format];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-5">
        <div>
          <p className="mb-2 text-xs font-semibold text-navy">Plantilla</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.name} type="button" onClick={() => setD((prev) => ({ ...prev, ...p.data }))} className="rounded-full border border-border px-3 py-1 text-xs text-navy hover:border-purple hover:bg-purple/5">
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
          Formato
          <select value={d.format} onChange={(e) => set("format", e.target.value as FormatId)} className={input}>
            {Object.entries(FORMATS).map(([k, f]) => (
              <option key={k} value={k}>
                {f.label} ({f.hint})
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border p-0.5 text-xs">
            {(["oscuro", "claro"] as const).map((t) => (
              <button key={t} type="button" onClick={() => set("theme", t)} className={`rounded-md px-3 py-1 capitalize ${d.theme === t ? "bg-navy text-white" : "text-navy"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Color de acento">
            {ACCENTS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={d.accent === c} aria-label={c} onClick={() => set("accent", c)} className={`size-6 rounded-full ring-offset-2 ${d.accent === c ? "ring-2 ring-navy" : ""}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-navy">
            <input type="checkbox" checked={d.planets} onChange={(e) => set("planets", e.target.checked)} className="accent-purple" /> Planetas
          </label>
          <button type="button" onClick={() => set("seed", Math.floor(Math.random() * 1e6))} className="inline-flex items-center gap-1 text-xs text-purple hover:underline">
            <Shuffle size={13} /> Otras estrellas
          </button>
        </div>
        {d.format !== "perfil" && (
          <>
            <input value={d.kicker} onChange={(e) => set("kicker", e.target.value)} maxLength={40} placeholder="Texto pequeño superior" className={input} aria-label="Texto superior" />
            <textarea value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={90} rows={2} placeholder="Título" className={`${input} font-semibold`} aria-label="Título" />
            <textarea value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={200} rows={2} placeholder="Subtítulo (opcional)" className={input} aria-label="Subtítulo" />
            {d.format !== "portada" && (
              <textarea value={d.items} onChange={(e) => set("items", e.target.value)} rows={4} placeholder="Lista (una por línea, máximo 6)" className={input} aria-label="Lista" />
            )}
            <input value={d.cta} onChange={(e) => set("cta", e.target.value)} maxLength={40} placeholder="Llamado a la acción" className={input} aria-label="Llamado a la acción" />
            <textarea value={d.contact} onChange={(e) => set("contact", e.target.value)} maxLength={120} rows={2} placeholder="Contacto al pie (máximo 2 líneas)" className={input} aria-label="Contacto" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:sticky lg:top-6">
        <div className="flex items-center justify-center rounded-xl border border-border bg-[repeating-conic-gradient(#ece9fb_0_25%,#fff_0_50%)] bg-[length:20px_20px] p-4">
          <canvas
            ref={canvas}
            className="h-auto max-h-[70dvh] w-auto max-w-full rounded-lg shadow-xl"
            style={{ aspectRatio: `${fmt.w} / ${fmt.h}` }}
            aria-label="Vista previa de la pieza"
          />
        </div>
        <p className="text-center text-xs text-muted">
          {fmt.w} × {fmt.h} px
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={download} disabled={!assets} className="shine inline-flex items-center gap-1.5 rounded-lg bg-purple px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet disabled:opacity-50">
            <Download size={16} /> Descargar PNG
          </button>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-border bg-white px-2 py-2 text-sm" aria-label="Proyecto">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={saveToFolder} disabled={!assets || busy} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy hover:border-purple disabled:opacity-50">
            <FolderUp size={16} /> Guardar en carpeta
          </button>
        </div>
      </div>
    </div>
  );
}
