/** Recursos de marca que aparecen en el panel desplegable de logos. */
export interface BrandAsset {
  file: string;
  name: string;
  desc: string;
  /** "publico": está en /public/marca · "privado": se sirve solo con sesión (sellos de firma) */
  access: "publico" | "privado";
  /** Fondo de la vista previa para que se lea bien */
  bg: "claro" | "oscuro";
}

export const BRAND_ASSETS: { group: string; items: BrandAsset[] }[] = [
  {
    group: "Logos",
    items: [
      { file: "logo-principal.png", name: "Logo principal", desc: "Fondo transparente, para fondos claros", access: "publico", bg: "claro" },
      { file: "logo-fondo-blanco.png", name: "Logo con fondo blanco", desc: "Para Word o donde no hay transparencia", access: "publico", bg: "claro" },
      { file: "portal.png", name: "Agujero negro", desc: "Solo el símbolo, fondo transparente", access: "publico", bg: "oscuro" },
      { file: "perfil.png", name: "Foto de perfil", desc: "WhatsApp y redes, 640×640", access: "publico", bg: "claro" },
    ],
  },
  {
    group: "Publicidad",
    items: [
      { file: "promo.png", name: "Imagen promocional", desc: "Instagram / Facebook, 1080×1350", access: "publico", bg: "oscuro" },
      { file: "promo-alta.png", name: "Promocional en alta", desc: "Para imprimir, 2160×2700", access: "publico", bg: "oscuro" },
    ],
  },
  {
    group: "Sellos de firma",
    items: [
      { file: "sello-e.png", name: "Sello E", desc: "Sello oficial de firma", access: "privado", bg: "claro" },
      { file: "sello-e-inclinado.png", name: "Sello E inclinado", desc: "Como sello estampado", access: "privado", bg: "claro" },
      { file: "sello-a.png", name: "Sello A", desc: "Circular a color", access: "privado", bg: "claro" },
      { file: "sello-b.png", name: "Sello B", desc: "Rectangular oscuro", access: "privado", bg: "claro" },
      { file: "sello-c.png", name: "Firma C", desc: "Con línea de firma", access: "privado", bg: "claro" },
      { file: "sello-d.png", name: "Emblema D", desc: "Sistema solar", access: "privado", bg: "claro" },
    ],
  },
];

export const PRIVATE_BRAND_FILES = new Set(
  BRAND_ASSETS.flatMap((g) => g.items).filter((a) => a.access === "privado").map((a) => a.file)
);

export function assetUrl(a: BrandAsset): string {
  return a.access === "publico" ? `/marca/${a.file}` : `/panel/marca/${a.file}`;
}
