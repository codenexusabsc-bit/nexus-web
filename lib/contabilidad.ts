/** Contabilidad: tipos y reglas de cálculo (sin acceso a datos, se usa también en el navegador). */
export type EntryKind = "ingreso" | "gasto";

export interface LedgerEntry {
  id: string;
  kind: EntryKind;
  concept: string;
  counterparty: string;
  amount: number;
  entryDate: string;
  reference: string;
  notes: string;
  collectionAccountId: string | null;
  projectId: string | null;
  hasFile: boolean;
  fileName: string;
  fileMime: string;
  fileSize: number;
  uploadedBy: string | null;
  createdAt: string;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Tolerancia para decir «es el 50 %» o «es el total»: 1 % del valor de la cuenta. */
const TOL = 0.01;

export type PaymentShare = { label: string; tone: "half" | "full" | "partial" | "over" };

/** Qué parte de la cuenta cubre UN pago: 50 %, valor completo, otro porcentaje o más de lo cobrado. */
export function paymentShare(amount: number, accountTotal: number): PaymentShare | null {
  if (!(accountTotal > 0) || !(amount > 0)) return null;
  const r = amount / accountTotal;
  if (Math.abs(r - 0.5) <= TOL / 2) return { label: "50 % de la cuenta", tone: "half" };
  if (Math.abs(r - 1) <= TOL) return { label: "Valor completo", tone: "full" };
  if (r > 1) return { label: `${Math.round(r * 100)} % (más de lo cobrado)`, tone: "over" };
  return { label: `${Math.round(r * 100)} % de la cuenta`, tone: "partial" };
}

export interface AccountProgress {
  paid: number;
  balance: number;
  percent: number;
  label: string;
  tone: "none" | "half" | "partial" | "full" | "over";
}

/** Estado acumulado de una cuenta según todos sus comprobantes. */
export function accountProgress(total: number, paid: number): AccountProgress {
  const percent = total > 0 ? (paid / total) * 100 : 0;
  const balance = Math.max(0, total - paid);
  if (paid <= 0) return { paid, balance, percent: 0, label: "Sin pagos", tone: "none" };
  if (paid > total * (1 + TOL)) return { paid, balance: 0, percent, label: "Pagado de más", tone: "over" };
  if (paid >= total * (1 - TOL)) return { paid, balance: 0, percent: 100, label: "Pagada completa", tone: "full" };
  if (Math.abs(percent - 50) <= 0.5) return { paid, balance, percent, label: "50 % pagado", tone: "half" };
  return { paid, balance, percent, label: `${Math.round(percent)} % pagado`, tone: "partial" };
}

/** Nombre de archivo seguro para la llave del objeto: sin rutas ni caracteres raros. */
export function safeFileName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[._]+/, "")
    .slice(-100);
  return clean || "archivo";
}

export const FILE_KEY_RE = /^contabilidad\/[0-9a-f-]{36}\/[^/]{1,120}$/;
