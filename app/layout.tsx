import type { Metadata } from "next";
import { Noto_Sans, Silkscreen } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans({
  variable: "--font-noto",
  subsets: ["latin"],
  display: "swap",
});

// Fuente pixel para títulos, a juego con el logo
const pixel = Silkscreen({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Nexus Ingeniería — Páginas web, software y redes",
    template: "%s | Nexus Ingeniería",
  },
  description:
    "Nexus Ingeniería diseña y construye páginas web, software a la medida, branding y soluciones de redes y telecomunicaciones.",
  authors: [{ name: "Nexus Ingeniería" }],
  openGraph: { images: ["/marca/promo.png"] },
  // La landing es pública e indexable; el panel y el acceso se marcan noindex en sus propios metadatos.
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-CO" className={`${noto.variable} ${pixel.variable} h-full`}>
      <body className="min-h-dvh flex flex-col antialiased">{children}</body>
    </html>
  );
}
