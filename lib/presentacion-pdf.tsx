/* eslint-disable jsx-a11y/alt-text -- <Image> de react-pdf no es una etiqueta HTML ni admite alt */
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Service, SiteContent } from "@/lib/sitio";

/**
 * PDF de "Presentación de servicios" generado con el mismo contenido de la landing.
 * Usa Helvetica (incluida en todo lector de PDF, soporta tildes y ñ).
 */

const C = {
  navy: "#0E0A26",
  deep: "#2E1065",
  purple: "#6D28D9",
  violet: "#9333EA",
  cyan: "#67E8F9",
  text: "#2A2540",
  muted: "#6B6585",
  bg: "#F6F4FF",
  border: "#E2DDF5",
};

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, paddingTop: 84, paddingBottom: 56, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10, color: C.text },
  header: { position: "absolute", top: 0, left: 0, right: 0, height: 56, backgroundColor: C.navy, flexDirection: "row", alignItems: "center", paddingHorizontal: 44 },
  headerLogo: { width: 22, height: 29, marginRight: 10 },
  headerName: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 14, letterSpacing: 4 },
  headerSub: { color: C.cyan, fontSize: 7, letterSpacing: 3 },
  footer: { position: "absolute", bottom: 22, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6 },
  kicker: { color: C.violet, fontSize: 8, letterSpacing: 3, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h2: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.navy, marginBottom: 12 },
  p: { fontSize: 10.5, lineHeight: 1.5, marginBottom: 8 },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12 },
  bold: { fontFamily: "Helvetica-Bold", color: C.navy },
});

function Header({ portal }: { portal: Buffer }) {
  return (
    <View style={s.header} fixed>
      <Image src={portal} style={s.headerLogo} />
      <View>
        <Text style={s.headerName}>NEXUS</Text>
        <Text style={s.headerSub}>INGENIERÍA</Text>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={s.footer} fixed>
      <Text>Nexus Ingeniería · Presentación de servicios</Text>
      <Text render={({ pageNumber }) => `${pageNumber}`} />
    </View>
  );
}

function PresentacionDoc({ content, services, portal }: { content: SiteContent; services: Service[]; portal: Buffer }) {
  const { hero, about, steps, team, values, contact } = content;
  return (
    <Document title="Presentación — Nexus Ingeniería" author="Nexus Ingeniería" language="es">
      {/* Portada */}
      <Page size="A4" style={{ backgroundColor: C.navy, padding: 56, fontFamily: "Helvetica", color: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <Image src={portal} style={{ width: 170, height: 224, marginBottom: 36 }} />
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 54, letterSpacing: 14 }}>NEXUS</Text>
        <Text style={{ color: C.cyan, fontSize: 14, letterSpacing: 8, marginTop: 6 }}>INGENIERÍA</Text>
        <View style={{ backgroundColor: C.violet, paddingVertical: 10, paddingHorizontal: 26, marginTop: 34, borderBottomWidth: 3, borderBottomColor: C.deep }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 12, letterSpacing: 3 }}>PRESENTACIÓN DE SERVICIOS</Text>
        </View>
        <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 34, textAlign: "center" }}>{hero.title}</Text>
        <Text style={{ fontSize: 11, color: "#D8D3F0", marginTop: 10, textAlign: "center", lineHeight: 1.5, maxWidth: 420 }}>{hero.subtitle}</Text>
      </Page>

      {/* Contenido */}
      <Page size="A4" style={s.page}>
        <Header portal={portal} />
        <Text style={s.kicker}>NOSOTROS</Text>
        <Text style={s.h2}>{about.title}</Text>
        {about.body.split(/\n{2,}/).map((p, i) => (
          <Text key={i} style={s.p}>{p}</Text>
        ))}

        <Text style={[s.kicker, { marginTop: 18 }]}>SERVICIOS</Text>
        <Text style={s.h2}>Lo que construimos</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {services.map((sv) => (
            <View key={sv.id} style={[s.card, { width: "48.5%", marginBottom: 10, borderLeftWidth: 4, borderLeftColor: sv.color }]} wrap={false}>
              <Text style={[s.bold, { fontSize: 11.5, marginBottom: 4 }]}>{sv.name}</Text>
              <Text style={{ fontSize: 9.5, lineHeight: 1.4, marginBottom: 4 }}>{sv.description}</Text>
              {sv.idealFor ? (
                <Text style={{ fontSize: 8.5, color: C.purple }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Ideal para: </Text>
                  {sv.idealFor}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        <View break>
          <Text style={s.kicker}>CÓMO TRABAJAMOS</Text>
          <Text style={s.h2}>{steps.length} pasos, usted aprueba cada uno</Text>
          {steps.map((st, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }} wrap={false}>
              <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: C.navy, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ color: "#FFFFFF", fontFamily: "Helvetica-Bold" }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1 }}>
                <Text style={s.bold}>{st.title}. </Text>
                {st.text}
              </Text>
            </View>
          ))}

          <Text style={[s.kicker, { marginTop: 18 }]}>EQUIPO</Text>
          <Text style={s.h2}>Quiénes le atienden</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {team.map((m) => (
              <View key={m.name} style={[s.card, { width: team.length > 1 ? "48.5%" : "100%" }]} wrap={false}>
                <Text style={[s.bold, { fontSize: 12 }]}>{m.name}</Text>
                <Text style={{ color: C.purple, fontSize: 9.5, marginBottom: 6 }}>{m.title}</Text>
                <Text style={{ fontSize: 9.5, lineHeight: 1.4 }}>{m.text}</Text>
              </View>
            ))}
          </View>

          {values.length > 0 && (
            <>
              <Text style={[s.kicker, { marginTop: 18 }]}>POR QUÉ ELEGIRNOS</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                {values.map((v) => (
                  <View key={v.title} style={[s.card, { width: "48.5%", marginBottom: 8 }]} wrap={false}>
                    <Text style={s.bold}>{v.title}</Text>
                    <Text style={{ fontSize: 9.5, color: C.muted }}>{v.text}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ backgroundColor: C.navy, borderRadius: 10, padding: 18, marginTop: 14, color: "#FFFFFF" }} wrap={false}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, letterSpacing: 2, marginBottom: 6 }}>HABLEMOS</Text>
            <Text style={{ fontSize: 10.5, marginBottom: 10 }}>
              La <Text style={{ color: C.cyan, fontFamily: "Helvetica-Bold" }}>primera consulta es sin costo</Text>: le escuchamos y le enviamos una propuesta con tiempos y precio.
            </Text>
            {contact.email ? <Text style={{ fontSize: 10.5 }}>Correo: {contact.email}</Text> : null}
            {contact.phones.length ? <Text style={{ fontSize: 10.5 }}>Teléfono / WhatsApp: {contact.phones.join("  ·  ")}</Text> : null}
          </View>
        </View>
        <Footer />
      </Page>
    </Document>
  );
}

export async function renderPresentacion(content: SiteContent, services: Service[]): Promise<Buffer> {
  const portal = await readFile(path.join(process.cwd(), "public", "marca", "portal.png"));
  return renderToBuffer(<PresentacionDoc content={content} services={services} portal={portal} />);
}
