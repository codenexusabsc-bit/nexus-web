import Image from "next/image";

/** Página temporal de la Fase 0. La landing real llega en la Fase 3. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-navy px-6 py-16 text-center">
      <Image
        src="/marca/portal.png"
        alt=""
        width={248}
        height={327}
        priority
        unoptimized
        className="pixelated h-auto w-40 sm:w-52"
      />
      <div>
        <h1 className="font-pixel text-5xl font-bold tracking-widest text-white sm:text-7xl">
          NEXUS
        </h1>
        <p className="mt-2 font-pixel text-lg tracking-[0.4em] text-cyan sm:text-xl">
          INGENIERÍA
        </p>
      </div>
      <p className="max-w-md text-lg text-white/85">
        Páginas web, software a la medida, branding y redes. Estamos construyendo
        nuestro sitio.
      </p>
      <p className="font-pixel bg-violet px-5 py-3 text-white">
        Primera consulta sin costo
      </p>
      <div className="text-cyan">
        <a href="mailto:codenexus.absc@gmail.com" className="underline">
          codenexus.absc@gmail.com
        </a>
        <p className="mt-1">321 954 3616 · 320 322 6265</p>
      </div>
    </main>
  );
}
