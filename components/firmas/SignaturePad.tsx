"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  /** PNG en data URL, o null si está vacío */
  toPng: () => string | null;
  clear: () => void;
}

/** Recuadro para firmar con el dedo, lápiz o mouse. */
export function SignaturePad({ ref, onChange }: { ref?: Ref<SignaturePadHandle>; onChange?: (empty: boolean) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  // Ajusta la resolución del lienzo a la pantalla (nítido en celulares)
  useEffect(() => {
    const c = canvas.current!;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0E0A26";
    ctx.lineWidth = 2.4;
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const mark = (isEmpty: boolean) => {
    setEmpty(isEmpty);
    onChange?.(isEmpty);
  };

  useImperativeHandle(ref, () => ({
    toPng: () => (empty ? null : trimmed(canvas.current!)),
    clear: () => {
      const c = canvas.current!;
      c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
      mark(true);
    },
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <canvas
          ref={canvas}
          className="h-44 w-full touch-none rounded-xl border-2 border-dashed border-purple/40 bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drawing.current = true;
            last.current = point(e);
          }}
          onPointerMove={(e) => {
            if (!drawing.current || !last.current) return;
            const p = point(e);
            const ctx = canvas.current!.getContext("2d")!;
            ctx.beginPath();
            ctx.moveTo(last.current.x, last.current.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
            if (empty) mark(false);
          }}
          onPointerUp={() => {
            drawing.current = false;
            last.current = null;
          }}
          aria-label="Recuadro para dibujar la firma"
          role="img"
        />
        {empty && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted">Firma aquí</span>}
        <span className="pointer-events-none absolute right-6 bottom-8 left-6 border-b border-border" aria-hidden="true" />
      </div>
      <button
        type="button"
        onClick={() => {
          const c = canvas.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          mark(true);
        }}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted hover:text-purple"
      >
        <Eraser size={13} /> Borrar y volver a firmar
      </button>
    </div>
  );
}

/** Recorta los bordes vacíos para que la firma quede ajustada. */
function trimmed(c: HTMLCanvasElement): string {
  const ctx = c.getContext("2d")!;
  const { width, height } = c;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return c.toDataURL("image/png");
  const pad = 12;
  const out = document.createElement("canvas");
  out.width = Math.min(width, maxX - minX + pad * 2);
  out.height = Math.min(height, maxY - minY + pad * 2);
  out.getContext("2d")!.drawImage(c, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
