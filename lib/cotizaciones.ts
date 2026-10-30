/** Cálculos, formato de dinero y armado de documentos para cotizaciones y cuentas de cobro. */
import type { PMNode } from "@/lib/pdf/nexus-document";

export interface QuoteItem {
  description: string;
  qty: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  number: number;
  title: string;
  clientName: string;
  clientIdNumber: string;
  clientEmail: string;
  projectId: string | null;
  items: QuoteItem[];
  discount: number;
  taxRate: number;
  total: number;
  notes: string;
  deliveryTime: string;
  validUntil: string | null;
  status: "borrador" | "enviada" | "aceptada" | "rechazada";
  documentId: string | null;
  createdAt: string;
}

export interface Billing {
  issuerName: string;
  issuerId: string;
  issuerCity: string;
  bankInfo: string;
  paymentTerms: string;
}

const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
export const cop = (n: number) => money.format(Math.round(n));

export function totals(items: QuoteItem[], discount: number, taxRate: number) {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const base = Math.max(0, subtotal - (discount || 0));
  const tax = Math.round(base * ((taxRate || 0) / 100));
  return { subtotal, base, tax, total: base + tax };
}

export const quoteNumber = (n: number) => `COT-${String(n).padStart(4, "0")}`;
export const collectionNumber = (n: number) => `CC-${String(n).padStart(4, "0")}`;

// ---- Constructores del JSON del editor -------------------------
const t = (text: string, bold = false): PMNode => ({ type: "text", text, ...(bold ? { marks: [{ type: "bold" }] } : {}) });
const p = (...content: PMNode[]): PMNode => ({ type: "paragraph", content: content.filter((n) => n.text) });
const h2 = (text: string): PMNode => ({ type: "heading", attrs: { level: 2 }, content: [t(text)] });
const cell = (text: string, header = false, bold = false): PMNode => ({ type: header ? "tableHeader" : "tableCell", content: [p(t(text, bold))] });
const row = (cells: PMNode[]): PMNode => ({ type: "tableRow", content: cells });

/** Documento de la cotización: queda en el editor para ajustar y enviar a firmar (firmado = aceptado). */
export function quoteDocument(q: Quote, billing: Billing, fmtDate: (iso: string) => string): PMNode {
  const tt = totals(q.items, q.discount, q.taxRate);
  const rows = [
    row([cell("Descripción", true), cell("Cant.", true), cell("Valor unitario", true), cell("Total", true)]),
    ...q.items.map((it) => row([cell(it.description), cell(String(it.qty)), cell(cop(it.unitPrice)), cell(cop(it.qty * it.unitPrice))])),
    row([cell("Subtotal", false, true), cell(""), cell(""), cell(cop(tt.subtotal), false, true)]),
  ];
  if (q.discount > 0) rows.push(row([cell("Descuento"), cell(""), cell(""), cell(`- ${cop(q.discount)}`)]));
  if (q.taxRate > 0) rows.push(row([cell(`IVA (${q.taxRate} %)`), cell(""), cell(""), cell(cop(tt.tax))]));
  rows.push(row([cell("TOTAL", false, true), cell(""), cell(""), cell(cop(tt.total), false, true)]));

  return {
    type: "doc",
    content: [
      p(t("Cotización: ", true), t(quoteNumber(q.number))),
      p(t("Para: ", true), t(q.clientName), ...(q.clientIdNumber ? [t(` · ${q.clientIdNumber}`)] : [])),
      p(t("Fecha: ", true), t(fmtDate(q.createdAt)), ...(q.validUntil ? [t("  ·  Válida hasta: ", true), t(fmtDate(q.validUntil))] : [])),
      h2("Detalle"),
      { type: "table", content: rows },
      ...(q.deliveryTime ? [p(t("Tiempo de entrega: ", true), t(q.deliveryTime))] : []),
      h2("Condiciones"),
      p(t("Forma de pago: ", true), t(billing.paymentTerms)),
      ...(q.notes ? q.notes.split(/\n+/).map((line) => p(t(line))) : []),
      p(t("Con la firma de este documento, el cliente acepta la cotización.")),
      p(t(billing.issuerName, true), ...(billing.issuerId ? [t(` · ${billing.issuerId}`)] : [])),
    ],
  };
}

export interface CollectionAccount {
  id: string;
  number: number;
  clientName: string;
  clientIdNumber: string;
  concept: string;
  amount: number;
  issuedOn: string;
  dueOn: string | null;
  status: "pendiente" | "pagada" | "anulada";
  paidOn: string | null;
  projectId: string | null;
  documentId: string | null;
  notes: string;
}

/** Documento de la cuenta de cobro, con los datos del emisor. */
export function collectionDocument(c: CollectionAccount, billing: Billing, fmtDate: (iso: string) => string): PMNode {
  return {
    type: "doc",
    content: [
      p(t(`${billing.issuerCity ? `${billing.issuerCity}, ` : ""}${fmtDate(c.issuedOn)}`)),
      p(t("Cuenta de cobro N.º ", true), t(collectionNumber(c.number))),
      p(t(c.clientName, true), ...(c.clientIdNumber ? [t(` · ${c.clientIdNumber}`)] : [])),
      h2("DEBE A"),
      p(t(billing.issuerName, true), ...(billing.issuerId ? [t(` · ${billing.issuerId}`)] : [])),
      h2("LA SUMA DE"),
      p(t(cop(c.amount), true)),
      h2("POR CONCEPTO DE"),
      p(t(c.concept)),
      ...(c.dueOn ? [p(t("Fecha límite de pago: ", true), t(fmtDate(c.dueOn)))] : []),
      ...(billing.bankInfo ? [p(t("Favor consignar a: ", true), t(billing.bankInfo))] : []),
      ...(c.notes ? [p(t(c.notes))] : []),
      p(t("Atentamente,")),
      p(t(billing.issuerName, true)),
    ],
  };
}
