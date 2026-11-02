import { getPublicServices, getSiteContent } from "@/lib/sitio";
import { getPublicPortfolio } from "@/lib/portafolio-data";
import { LandingView } from "@/components/landing/LandingView";

/** Landing pública con el contenido publicado. Se edita y previsualiza en /panel/sitio. */
export default async function Home() {
  const [content, services, portfolio] = await Promise.all([getSiteContent(), getPublicServices(), getPublicPortfolio()]);
  return <LandingView content={content} services={services} portfolio={portfolio} />;
}
