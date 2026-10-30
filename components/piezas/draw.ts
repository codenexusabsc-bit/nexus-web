/** Dibujo de las piezas para redes en un <canvas>, con el estilo espacial pixel de Nexus. */

export type FormatId = "post" | "historia" | "cuadrado" | "portada" | "perfil";

export const FORMATS: Record<FormatId, { label: string; w: number; h: number; hint: string }> = {
  post: { label: "Post Instagram / Facebook", w: 1080, h: 1350, hint: "4:5" },
  historia: { label: "Historia / estado de WhatsApp", w: 1080, h: 1920, hint: "9:16" },
  cuadrado: { label: "Post cuadrado", w: 1080, h: 1080, hint: "1:1" },
  portada: { label: "Portada de Facebook", w: 1640, h: 624, hint: "820×312 ×2" },
  perfil: { label: "Foto de perfil", w: 640, h: 640, hint: "1:1" },
};

export interface PieceData {
  format: FormatId;
  theme: "oscuro" | "claro";
  accent: string;
  kicker: string;
  title: string;
  subtitle: string;
  items: string;
  cta: string;
  contact: string;
  planets: boolean;
  seed: number;
}

export interface Assets {
  portal: HTMLImageElement;
  planets: HTMLImageElement[];
  sans: string;
  pixel: string;
}

const NAVY = "#0E0A26";
const CYAN = "#67E8F9";
const STAR_COLORS = ["#F5F3FF", "#67E8F9", "#C04CF5", "#9333EA", "#F5F3FF"];
const PLANET_DOTS = ["#9333EA", "#6366F1", "#F472B6", "#FB923C", "#2DD4BF", "#67E8F9"];

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxW && line) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });
}

export function drawPiece(canvas: HTMLCanvasElement, d: PieceData, a: Assets) {
  const { w, h } = FORMATS[d.format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  const dark = d.theme === "oscuro";
  const ink = dark ? "#FFFFFF" : NAVY;
  const soft = dark ? "rgba(225,220,255,0.85)" : "#4B4566";
  const r = rng(d.seed);
  const u = Math.min(w, h) / 100; // unidad relativa

  // Fondo
  ctx.fillStyle = dark ? NAVY : "#F6F4FF";
  ctx.fillRect(0, 0, w, h);
  if (dark) {
    const g = ctx.createRadialGradient(w * 0.2, h * 0.15, 0, w * 0.2, h * 0.15, Math.max(w, h) * 0.7);
    g.addColorStop(0, `${d.accent}55`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const px = Math.max(2, Math.round(u * 0.45));
    for (let i = 0; i < (w * h) / 9000; i++) {
      ctx.fillStyle = STAR_COLORS[Math.floor(r() * STAR_COLORS.length)];
      ctx.globalAlpha = 0.3 + r() * 0.7;
      const x = Math.floor((r() * w) / px) * px;
      const y = Math.floor((r() * h) / px) * px;
      const s = r() < 0.1 ? px * 2 : px;
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  const wide = d.format === "portada";
  const square = d.format === "cuadrado" || d.format === "perfil";

  // Portal con órbita y planetas
  const portalH = wide ? h * 0.72 : d.format === "perfil" ? h * 0.48 : square ? h * 0.3 : d.format === "historia" ? h * 0.24 : h * 0.26;
  const portalW = portalH * (a.portal.width / a.portal.height);
  const pcx = wide ? w * 0.2 : w / 2;
  const pcy = wide ? h / 2 : d.format === "perfil" ? h * 0.38 : h * (d.format === "historia" ? 0.2 : square ? 0.22 : 0.2);
  ctx.save();
  ctx.translate(pcx, pcy);
  ctx.rotate(-0.25);
  ctx.setLineDash([u * 1.4, u * 1.6]);
  ctx.strokeStyle = `${d.accent}cc`;
  ctx.lineWidth = Math.max(3, u * 0.5);
  ctx.beginPath();
  ctx.ellipse(0, 0, portalW * 1.35, portalH * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);
  ctx.drawImage(a.portal, pcx - portalW / 2, pcy - portalH / 2, portalW, portalH);
  if (d.planets && a.planets.length) {
    const spots: [number, number, number][] = [
      [1.15, -0.55, 0.42],
      [-1.2, 0.35, 0.3],
      [0.95, 0.6, 0.2],
      [-0.75, -0.7, 0.16],
    ];
    // En la portada el texto está a la derecha: planetas más pequeños y pegados al portal
    const sx = wide ? 0.62 : 1;
    const ss = wide ? 0.55 : 1;
    spots.forEach(([dx0, dy, sz0], i) => {
      const dx = dx0 * sx;
      const sz = sz0 * ss;
      const img = a.planets[i % a.planets.length];
      const ph = portalH * sz;
      const pw = ph * (img.width / img.height);
      ctx.drawImage(img, pcx + dx * portalW - pw / 2, pcy + dy * portalH - ph / 2, pw, ph);
    });
  }

  // Bloque de texto
  const x0 = wide ? w * 0.4 : w * 0.08;
  const tw = wide ? w * 0.55 : w * 0.84;
  const centered = !wide;
  ctx.textAlign = centered ? "center" : "left";
  const tx = centered ? w / 2 : x0;
  let y = wide ? h * 0.18 : pcy + portalH * 0.62 + u * 4;

  const text = (t: string, font: string, color: string, lh: number, maxW = tw) => {
    if (!t.trim()) return;
    ctx.font = font;
    ctx.fillStyle = color;
    for (const line of wrap(ctx, t, maxW)) {
      y += lh;
      ctx.fillText(line, tx, y);
    }
  };

  // Marca
  const brand = d.format === "perfil" ? u * 11 : wide ? u * 13 : u * 9;
  ctx.font = `700 ${brand}px ${a.pixel}`;
  ctx.fillStyle = ink;
  y += brand;
  ctx.fillText("NEXUS", tx, y);
  ctx.font = `400 ${brand * 0.32}px ${a.pixel}`;
  ctx.fillStyle = dark ? CYAN : d.accent;
  y += brand * 0.5;
  ctx.fillText("INGENIERÍA", tx, y);
  if (d.format === "perfil") return;

  y += u * 2;
  text(d.kicker.toUpperCase(), `400 ${u * 2.6}px ${a.pixel}`, dark ? CYAN : d.accent, u * 4.5);
  text(d.title, `700 ${wide ? u * 7.2 : u * 6.6}px ${a.sans}`, ink, wide ? u * 8.4 : u * 7.8);
  if (d.subtitle.trim()) {
    y += u * 0.8;
    text(d.subtitle, `400 ${u * 3.1}px ${a.sans}`, soft, u * 4.4);
  }

  // Pie reservado: contacto abajo del todo y la cinta justo encima
  const contactLines = d.contact.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 2);
  const contactTop = h - u * 4 - contactLines.length * u * 4;
  const ch = u * (wide ? 8 : 7.5);
  const ctaY = wide ? h * 0.66 : contactTop - u * 3 - ch;
  const limit = d.cta.trim() ? ctaY - u * 2 : contactTop - u * 2;

  // Lista con planetas de colores (solo las filas que caben)
  const items = d.items.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 6);
  if (items.length && !wide) {
    y += u * 2.5;
    const cols = items.length > 3 && d.format !== "historia" ? 2 : 1;
    const colW = tw / cols;
    const rowH = u * 5.2;
    const maxRows = Math.max(0, Math.floor((limit - y) / rowH));
    ctx.font = `400 ${u * 3.1}px ${a.sans}`;
    ctx.textAlign = "left";
    items.forEach((it, i) => {
      const c = cols === 2 ? i % 2 : 0;
      const row = cols === 2 ? Math.floor(i / 2) : i;
      if (row >= maxRows) return;
      const ix = x0 + c * colW + (cols === 1 ? tw * 0.25 : u * 4);
      const iy = y + row * rowH + u * 3.6;
      ctx.fillStyle = PLANET_DOTS[i % PLANET_DOTS.length];
      ctx.beginPath();
      ctx.arc(ix, iy - u * 1.1, u * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillText(it, ix + u * 2.6, iy);
    });
    ctx.textAlign = centered ? "center" : "left";
  }

  // Cinta de llamado a la acción
  if (d.cta.trim()) {
    ctx.font = `700 ${u * 3}px ${a.pixel}`;
    const cw = Math.min(tw, ctx.measureText(d.cta.toUpperCase()).width + u * 10);
    const cx = centered ? w / 2 - cw / 2 : x0;
    ctx.fillStyle = d.accent;
    ctx.fillRect(cx, ctaY, cw, ch);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(cx, ctaY + ch, cw, u * 0.9);
    ctx.fillStyle = "#FFFFFF";
    ctx.textBaseline = "middle";
    ctx.fillText(d.cta.toUpperCase(), centered ? w / 2 : cx + u * 5, ctaY + ch / 2);
    ctx.textBaseline = "alphabetic";
  }

  // Contacto al pie
  if (contactLines.length) {
    ctx.font = `600 ${u * 2.9}px ${a.sans}`;
    ctx.fillStyle = dark ? CYAN : NAVY;
    contactLines.forEach((l, i) => ctx.fillText(l, centered ? w / 2 : x0, contactTop + u * 3 + i * u * 4));
  }
}
