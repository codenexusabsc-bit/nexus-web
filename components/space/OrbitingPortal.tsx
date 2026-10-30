/**
 * El agujero negro de la marca flotando, con planetas pixel en órbita.
 * Las órbitas usan SVG <animateMotion>: funciona en todos los navegadores sin JavaScript.
 */
export function OrbitingPortal({ className = "" }: { className?: string }) {
  // Órbita principal: elipse inclinada alrededor del portal (viewBox 400×400).
  const orbitA = "M 40 230 A 160 52 0 1 1 360 170 A 160 52 0 1 1 40 230 Z";
  const orbitB = "M 70 120 A 140 140 0 1 1 330 280 A 140 140 0 1 1 70 120 Z";
  return (
    <div className={`relative aspect-square ${className}`} aria-hidden="true">
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full overflow-visible">
        <path d={orbitB} fill="none" stroke="#6D28D9" strokeOpacity="0.45" strokeWidth="2" strokeDasharray="6 10" />
        <path d={orbitA} fill="none" stroke="#9333EA" strokeOpacity="0.7" strokeWidth="2.5" strokeDasharray="8 10" />

        {/* Planetas detrás del portal (mitad superior de la órbita B) */}
        <image href="/marca/planetas/cian.png" width="22" height="22" x="-11" y="-11" className="pixelated">
          <animateMotion dur="26s" repeatCount="indefinite" path={orbitB} />
        </image>

        <image href="/marca/portal.png" x="122" y="96" width="156" height="206" className="pixelated portal-float" />

        <image href="/marca/planetas/teal.png" width="72" height="40" x="-36" y="-20" className="pixelated">
          <animateMotion dur="18s" repeatCount="indefinite" path={orbitA} />
        </image>
        <image href="/marca/planetas/naranja.png" width="34" height="34" x="-17" y="-17" className="pixelated">
          <animateMotion dur="18s" begin="-9s" repeatCount="indefinite" path={orbitA} />
        </image>
        <image href="/marca/planetas/rosa.png" width="24" height="24" x="-12" y="-12" className="pixelated">
          <animateMotion dur="26s" begin="-13s" repeatCount="indefinite" path={orbitB} />
        </image>
      </svg>
    </div>
  );
}
