import { getPublicServices, getSiteContent } from "@/lib/sitio";
import { LandingView } from "@/components/landing/LandingView";

/** Landing pública con el contenido publicado. Se edita y previsualiza en /panel/sitio. */
export default async function Home() {
  const [content, services] = await Promise.all([getSiteContent(), getPublicServices()]);
  return <LandingView content={content} services={services} />;
}
