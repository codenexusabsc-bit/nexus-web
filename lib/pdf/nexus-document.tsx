/* eslint-disable jsx-a11y/alt-text -- <Image> de react-pdf no es una etiqueta HTML ni admite alt */
import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

/**
 * Plantilla PDF de Nexus para los documentos del editor.
 * Se usa en el navegador (vista previa en vivo) y en el servidor; no lee archivos:
 * la imagen del portal llega como URL o Buffer.
 */

export const PDF_COLORS = {
  navy: "#0E0A26",
  deep: "#2E1065",
  purple: "#6D28D9",
  violet: "#9333EA",
  cyan: "#67E8F9",
  text: "#2A2540",
  muted: "#6B6585",
  border: "#E2DDF5",
  soft: "#F6F4FF",
};
const C = PDF_COLORS;

const s = StyleSheet.create({
  page: { paddingTop: 92, paddingBottom: 64, paddingHorizontal: 56, fontFamily: "Helvetica", fontSize: 10.5, color: C.text, lineHeight: 1.45 },
  header: { position: "absolute", top: 0, left: 0, right: 0, height: 60, backgroundColor: C.navy, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 56 },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  footer: { position: "absolute", bottom: 26, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 4 },
  rule: { height: 2, backgroundColor: C.cyan, width: 48, marginBottom: 18 },
  p: { marginBottom: 7 },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.navy, marginTop: 10, marginBottom: 6 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.purple, marginTop: 8, marginBottom: 5 },
  h3: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: C.navy, marginTop: 6, marginBottom: 4 },
  hr: { height: 1, backgroundColor: C.border, marginVertical: 10 },
  quote: { borderLeftWidth: 3, borderLeftColor: C.violet, paddingLeft: 10, color: C.muted, marginBottom: 7 },
  li: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 16, color: C.violet },
  table: { borderWidth: 1, borderColor: C.border, marginBottom: 10 },
  tr: { flexDirection: "row" },
  td: { flex: 1, padding: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  th: { flex: 1, padding: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: C.border, backgroundColor: C.soft, fontFamily: "Helvetica-Bold", color: C.navy },
});

export interface NexusDocProps {
  title: string;
  /** Subtítulo pequeño bajo el título (p. ej. "Preparado para Bonett Asociados") */
  subtitle?: string;
  portal: string | Buffer;
  children: ReactNode;
}

export function NexusDocument({ title, subtitle, portal, children }: NexusDocProps) {
  return (
    <Document title={title} author="Nexus Ingeniería" creator="Panel Nexus" language="es">
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View style={s.headerLeft}>
            <Image src={portal} style={{ width: 24, height: 32, marginRight: 10 }} />
            <View>
              <Text style={{ color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 14, letterSpacing: 4 }}>NEXUS</Text>
              <Text style={{ color: C.cyan, fontSize: 7, letterSpacing: 3 }}>INGENIERÍA</Text>
            </View>
          </View>
          <Text style={{ color: "#C9C3EA", fontSize: 8 }}>{title}</Text>
        </View>

        <Text style={s.title}>{title}</Text>
        {subtitle ? <Text style={{ color: C.muted, marginBottom: 6 }}>{subtitle}</Text> : null}
        <View style={s.rule} />

        {children}

        <View style={s.footer} fixed>
          <Text>Nexus Ingeniería · codenexus.absc@gmail.com</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ---- Del JSON del editor (TipTap) a elementos del PDF ------------

export interface PMNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: PMNode[];
}

/** Reemplaza {variable} por su valor; las que no tienen valor quedan visibles para notarlas. */
export function fillVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{([a-z0-9_áéíóúñ]+)\}/gi, (m, key: string) => {
    const v = vars[key.toLowerCase()];
    return v && v.trim() ? v : m;
  });
}

function inline(nodes: PMNode[] | undefined, vars: Record<string, string>): ReactNode[] {
  return (nodes ?? []).map((n, i) => {
    if (n.type === "hardBreak") return "\n";
    if (n.type !== "text") return null;
    const text = fillVariables(n.text ?? "", vars);
    const marks = n.marks ?? [];
    const has = (t: string) => marks.some((m) => m.type === t);
    const bold = has("bold");
    const italic = has("italic");
    const style = {
      fontFamily: bold && italic ? "Helvetica-BoldOblique" : bold ? "Helvetica-Bold" : italic ? "Helvetica-Oblique" : "Helvetica",
      textDecoration: has("underline") ? ("underline" as const) : has("strike") ? ("line-through" as const) : undefined,
    };
    const link = marks.find((m) => m.type === "link")?.attrs?.href as string | undefined;
    if (link) {
      return (
        <Link key={i} src={link} style={{ ...style, color: C.purple }}>
          {text}
        </Link>
      );
    }
    return (
      <Text key={i} style={style}>
        {text}
      </Text>
    );
  });
}

function align(n: PMNode) {
  const a = n.attrs?.textAlign as string | undefined;
  return a && a !== "left" ? { textAlign: a as "center" | "right" | "justify" } : {};
}

function list(n: PMNode, vars: Record<string, string>, ordered: boolean, depth: number, key: number): ReactNode {
  const startAt = (n.attrs?.start as number | undefined) ?? 1;
  return (
    <View key={key} style={{ marginBottom: depth ? 0 : 7, marginLeft: depth * 14 }}>
      {(n.content ?? []).map((item, i) => (
        <View key={i} style={s.li} wrap={false}>
          <Text style={s.bullet}>{ordered ? `${startAt + i}.` : "•"}</Text>
          <View style={{ flex: 1 }}>
            {(item.content ?? []).map((child, j) =>
              child.type === "bulletList" || child.type === "orderedList"
                ? list(child, vars, child.type === "orderedList", depth + 1, j)
                : <Text key={j}>{inline(child.content, vars)}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Convierte los bloques del editor en elementos de react-pdf. */
export function renderBlocks(doc: PMNode, vars: Record<string, string>): ReactNode[] {
  return (doc.content ?? []).map((n, i) => {
    switch (n.type) {
      case "paragraph":
        return n.content?.length ? (
          <Text key={i} style={[s.p, align(n)]}>
            {inline(n.content, vars)}
          </Text>
        ) : (
          <Text key={i} style={s.p}> </Text>
        );
      case "heading": {
        const level = (n.attrs?.level as number) ?? 1;
        const style = level === 1 ? s.h1 : level === 2 ? s.h2 : s.h3;
        return (
          <Text key={i} style={[style, align(n)]} minPresenceAhead={40}>
            {inline(n.content, vars)}
          </Text>
        );
      }
      case "bulletList":
      case "orderedList":
        return list(n, vars, n.type === "orderedList", 0, i);
      case "blockquote":
        return (
          <View key={i} style={s.quote}>
            {renderBlocks(n, vars)}
          </View>
        );
      case "horizontalRule":
        return <View key={i} style={s.hr} />;
      case "pageBreak":
        return <View key={i} break />;
      case "table":
        return (
          <View key={i} style={s.table}>
            {(n.content ?? []).map((row, r) => (
              <View key={r} style={s.tr} wrap={false}>
                {(row.content ?? []).map((cell, c) => (
                  <View key={c} style={cell.type === "tableHeader" ? s.th : s.td}>
                    {(cell.content ?? []).map((p, k) => (
                      <Text key={k}>{inline(p.content, vars)}</Text>
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      default:
        return null;
    }
  });
}
