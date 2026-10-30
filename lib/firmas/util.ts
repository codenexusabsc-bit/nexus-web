import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** Días que dura un enlace de firma para clientes. */
export const LINK_DAYS = 15;

export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Token del enlace del cliente: 32 bytes aleatorios. En la base de datos solo se guarda su hash. */
export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256Hex(token) };
}

export function isToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}

/** IP del firmante según las cabeceras de Netlify o del proxy. */
export function clientIp(h: Headers): string {
  return (
    h.get("x-nf-client-connection-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    ""
  ).slice(0, 64);
}

export function userAgent(h: Headers): string {
  return (h.get("user-agent") ?? "").slice(0, 400);
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** PNG en data URL (firma dibujada) → bytes, con validación de tipo y tamaño. */
export function pngFromDataUrl(dataUrl: string, maxBytes = 400_000): Uint8Array | null {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Uint8Array.from(Buffer.from(m[1], "base64"));
  const isPng = bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  return isPng && bytes.length <= maxBytes ? bytes : null;
}

/** ¿Ya pasó esta fecha? (fuera del render para no usar Date.now() en componentes) */
export function isExpired(iso: string | null): boolean {
  return iso !== null && Date.parse(iso) < Date.now();
}
