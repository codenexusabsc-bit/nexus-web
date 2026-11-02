/** Registro de actividad: tipos y textos compartidos (sin acceso a datos). */
export type ActivityAction = "crear" | "editar" | "borrar" | "firmar";

export interface ActivityEntry {
  id: number;
  at: string;
  actor: string | null;
  action: ActivityAction;
  table: string;
  recordId: string;
  summary: string;
}

export const ACTION_LABEL: Record<ActivityAction, string> = {
  crear: "creó",
  editar: "editó",
  borrar: "borró",
  firmar: "firmó",
};

/** Nombre legible de cada tabla registrada y, si existe, la sección del panel donde se ve. */
export const TABLE_LABEL: Record<string, { label: string; href?: string }> = {
  projects: { label: "un proyecto", href: "/panel/carpeta" },
  files: { label: "un archivo", href: "/panel/carpeta" },
  doc_requests: { label: "una solicitud de documento", href: "/panel/solicitudes" },
  documents: { label: "un documento", href: "/panel/documentos" },
  signature_requests: { label: "una solicitud de firma", href: "/panel/firmas" },
  signers: { label: "un documento", href: "/panel/firmas" },
  quotes: { label: "una cotización", href: "/panel/cotizaciones" },
  collection_accounts: { label: "una cuenta de cobro", href: "/panel/cotizaciones" },
  leads: { label: "un prospecto", href: "/panel/prospectos" },
  tasks: { label: "una tarea", href: "/panel/carpeta" },
  portfolio_items: { label: "un proyecto del portafolio", href: "/panel/portafolio" },
  ledger_entries: { label: "un movimiento contable", href: "/panel/contabilidad" },
};
