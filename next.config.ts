import type { NextConfig } from "next";

/** Cabeceras de seguridad para todo el sitio (checklist de seguridad del plan). */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Los sellos de firma se leen del disco en una ruta protegida: incluirlos en la función de Netlify.
  outputFileTracingIncludes: {
    "/panel/marca/[archivo]": ["./private/marca/**"],
    "/presentacion": ["./public/marca/portal.png"],
    // El sello E se lee del disco al sellar un PDF firmado
    "/panel/firmas/[id]": ["./private/marca/sello-e.png"],
    "/firmar/[token]": ["./private/marca/sello-e.png"],
  },
  // react-pdf trae binarios (yoga) que no deben empaquetarse.
  serverExternalPackages: ["@react-pdf/renderer", "pdf-lib"],
  headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
